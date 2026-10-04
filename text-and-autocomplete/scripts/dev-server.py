"""Local dev server for dist/. Skips the hostname lookup that stalls
http.server on some machines, and disables caching so edits show on reload.

/eval/ is served from eval/ on the same origin, so the evaluation runner can
use the editor's saved key and modules without ever being copied into dist/."""
import functools
import os
import http.server
import pathlib
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4174
ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
EVAL = ROOT / 'eval'

class Server(http.server.ThreadingHTTPServer):
    def server_bind(self):
        socketserver.TCPServer.server_bind(self)
        self.server_name = 'localhost'
        self.server_port = PORT

class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if path == '/eval' or path.startswith(('/eval/', '/eval?')):
            # Resolve against eval/ for this request only: the handler serves
            # every request on a connection, so its directory must not change.
            served = super().translate_path(path[len('/eval'):])
            return os.path.join(str(EVAL), os.path.relpath(served, self.directory))
        return super().translate_path(path)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

Server(('127.0.0.1', PORT), functools.partial(Handler, directory=str(DIST))).serve_forever()
