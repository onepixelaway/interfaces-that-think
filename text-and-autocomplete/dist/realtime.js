import {
  MODEL,
  responseEvent,
  COMPOSE_INSTRUCTIONS,
  MAX_OUTPUT_TOKENS,
} from './compose-core.js?v=2b7382bcbabf';
import { rewriteEvent } from './rewrite-core.js?v=91f7e8868eb3';
import { combineEvent } from './combine-core.js?v=3a75d9186a2f';

export class RealtimeCompose {
  constructor(
    onStatus,
    {
      fetchImpl = (...args) => globalThis.fetch(...args),
      Socket = WebSocket,
      diagnose = () => {},
    } = {},
  ) {
    this.diagnose = (event, data) => {
      try {
        diagnose(event, data);
      } catch {}
    };
    this.onStatus = onStatus;
    this.fetch = fetchImpl;
    this.Socket = Socket;
    this.socket = null;
    this.pending = null;
    this.ready = false;
    this.generation = 0;
  }
  async connect(key) {
    this.disconnect();
    const generation = this.generation;
    this.onStatus('connecting');
    const auth = new AbortController();
    this.auth = auth;
    const authTimer = setTimeout(() => auth.abort(), 15000);
    try {
      const response = await this.fetch('https://api.openai.com/v1/realtime/client_secrets', {
        method: 'POST',
        signal: auth.signal,
        credentials: 'omit',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expires_after: { anchor: 'created_at', seconds: 60 },
          session: {
            type: 'realtime',
            model: MODEL,
            output_modalities: ['text'],
            max_output_tokens: MAX_OUTPUT_TOKENS,
            instructions: COMPOSE_INSTRUCTIONS,
            reasoning: { effort: 'minimal' },
            audio: { input: { turn_detection: null } },
          },
        }),
      });
      key = ''; // The transport uses only the ephemeral token after this exchange.
      if (!response.ok) {
        const messages = {
          401: 'The API key was rejected. Check it and try again.',
          403: 'This key cannot access the selected Realtime model.',
          429: 'OpenAI rate limit or quota reached. Check your API billing and try again later.',
        };
        throw new Error(
          messages[response.status] || `OpenAI could not start a session (${response.status}).`,
        );
      }
      const data = await response.json();
      if (generation !== this.generation) throw new Error('Connection cancelled.');
      if (typeof data.value !== 'string') throw new Error('OpenAI did not return a session token.');
      await new Promise((resolve, reject) => {
        const socket = new this.Socket(`wss://api.openai.com/v1/realtime?model=${MODEL}`, [
          'realtime',
          `openai-insecure-api-key.${data.value}`,
        ]);
        data.value = '';
        this.socket = socket;
        let connected = false;
        const timeout = setTimeout(
          () => fail('Connection timed out. Try connecting again.'),
          15000,
        );
        const fail = message => {
          clearTimeout(timeout);
          if (!connected) reject(new Error(message));
        };
        this.rejectConnection = reject;
        socket.onmessage = event => {
          if (generation !== this.generation) return;
          let message;
          try {
            message = JSON.parse(event.data);
          } catch {
            return;
          }
          if (message.type === 'session.created') {
            connected = true;
            this.rejectConnection = null;
            clearTimeout(timeout);
            this.ready = true;
            this.onStatus('ready');
            resolve();
          } else if (message.type === 'error') {
            this.diagnose('transport-error', {
              code: message.error?.code || 'unknown',
              requestId: this.pending?.id || null,
              attempt: this.pending?.attempt || null,
            });
            if (message.error?.code === 'response_cancel_not_active') return;
            const detail =
              message.error?.code === 'rate_limit_exceeded'
                ? 'OpenAI rate limit reached. Wait before reconnecting.'
                : 'OpenAI could not complete this request. Reconnect or check your model access.';
            if (!connected) fail(detail);
            else {
              // One request failed; the connection is still open, so stay ready.
              this.finishError(detail);
              this.onStatus('ready', detail);
            }
          } else this.receive(message);
        };
        socket.onerror = () =>
          fail('Could not connect to OpenAI. Check your network and model access.');
        socket.onclose = () => {
          clearTimeout(timeout);
          if (generation !== this.generation) return;
          this.ready = false;
          this.finishError('Connection closed. Open settings to reconnect.');
          if (!connected) reject(new Error('Connection closed before it was ready.'));
          this.onStatus('disconnected');
        };
      });
    } catch (error) {
      if (generation === this.generation) {
        this.disconnect();
        this.onStatus(
          'error',
          error.name === 'AbortError' ? 'Connection timed out. Please try again.' : error.message,
        );
      }
      throw error;
    } finally {
      clearTimeout(authTimer);
    }
  }
  request(context, onProgress = () => {}, attempt = null, options = {}) {
    return this.sendRequest(
      id => responseEvent(id, context, options),
      onProgress,
      options.paragraphs ? 20000 : 10000,
      attempt,
    );
  }
  rewrite(context, ratio, onProgress = () => {}, revision = null, rephrase = null) {
    return this.sendRequest(
      id => rewriteEvent(id, context, ratio, revision, rephrase),
      onProgress,
      20000,
    );
  }
  combine(context) {
    return this.sendRequest(
      id => combineEvent(id, context),
      () => {},
      20000,
    );
  }
  sendRequest(event, onProgress, timeout, attempt = null) {
    this.cancel();
    if (!this.ready) return Promise.reject(new Error('Connect OpenAI first.'));
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const pending = { id, attempt, resolve, reject, onProgress, text: '', responseId: null };
      this.diagnose('transport-request', { requestId: id, attempt, timeout });
      pending.timer = setTimeout(() => {
        if (this.pending !== pending) return;
        this.finishError('Writing request timed out. Try again.');
        if (pending.responseId && this.ready) this.cancelResponse(pending.responseId);
      }, timeout);
      this.pending = pending;
      try {
        this.socket.send(JSON.stringify(event(id)));
      } catch {
        this.finishError('Unable to send a writing request.');
      }
    });
  }
  receive(event) {
    if (event.type === 'response.created') {
      if (this.pending?.id === event.response.metadata?.request_id) {
        this.pending.responseId = event.response.id;
        this.diagnose('transport-response-created', {
          requestId: this.pending.id,
          attempt: this.pending.attempt,
          responseId: event.response.id,
        });
      } else if (this.ready) {
        this.cancelResponse(event.response.id);
      }
    }
    if (
      event.type === 'response.output_text.delta' &&
      this.pending?.responseId &&
      this.pending.responseId === event.response_id
    ) {
      this.pending.text += event.delta;
      this.pending.onProgress(this.pending.text, false);
      return;
    }
    if (
      event.type === 'response.output_text.done' &&
      this.pending?.responseId &&
      this.pending.responseId === event.response_id
    ) {
      this.diagnose('transport-text-done', {
        requestId: this.pending.id,
        attempt: this.pending.attempt,
        chars: event.text.length,
      });
      this.pending.text = event.text;
      this.pending.onProgress(event.text, true);
      return;
    }
    if (
      event.type !== 'response.done' ||
      this.pending?.id !== event.response.metadata?.request_id
    ) {
      return;
    }
    const pending = this.pending;
    this.pending = null;
    clearTimeout(pending.timer);
    this.diagnose('transport-response-done', {
      requestId: pending.id,
      attempt: pending.attempt,
      status: event.response.status,
      reason:
        event.response.status_details?.reason || event.response.status_details?.error?.code || null,
      streamedChars: pending.text.length,
    });
    if (event.response.status !== 'completed') {
      pending.reject(new Error('The writing request did not finish. Please try again.'));
      return;
    }
    const text = (event.response.output || [])
      .flatMap(item => item.content || [])
      .filter(part => part.type === 'text' || part.type === 'output_text')
      .map(part => part.text || '')
      .join('');
    this.diagnose('transport-final-text', {
      requestId: pending.id,
      attempt: pending.attempt,
      chars: text.length,
      matchesStream: text === pending.text,
    });
    pending.resolve(text);
  }
  finishError(message) {
    if (this.pending) {
      this.diagnose('transport-failed', {
        requestId: this.pending.id,
        attempt: this.pending.attempt,
        message,
      });
      clearTimeout(this.pending.timer);
      this.pending.reject(new Error(message));
      this.pending = null;
    }
  }
  cancel() {
    const pending = this.pending;
    if (!pending) return;
    this.diagnose('transport-cancelled', {
      requestId: pending.id,
      attempt: pending.attempt,
      responseId: pending.responseId,
    });
    if (pending.responseId && this.ready) this.cancelResponse(pending.responseId);
    clearTimeout(pending.timer);
    this.pending = null;
    pending.reject(new DOMException('Superseded', 'AbortError'));
  }
  cancelResponse(responseId) {
    this.socket.send(JSON.stringify({ type: 'response.cancel', response_id: responseId }));
  }
  disconnect() {
    this.generation++;
    this.rejectConnection?.(new Error('Connection cancelled.'));
    this.rejectConnection = null;
    this.auth?.abort();
    this.cancel();
    this.ready = false;
    this.socket?.close();
    this.socket = null;
    this.onStatus('disconnected');
  }
}
