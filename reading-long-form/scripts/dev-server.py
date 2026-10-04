"""Local dev server for dist/. Skips the hostname lookup that stalls
http.server on some machines, and disables caching so edits show on reload.

    python3 scripts/dev-server.py [port] [folder]

The folder, relative to the prototype, defaults to dist; pass . to serve the
design explorations next to it, which link to dist for the essay's styles."""
import functools
import http.server
import pathlib
import socketserver
import sys
import urllib.parse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4175
ROOT = pathlib.Path(__file__).resolve().parent.parent / (sys.argv[2] if len(sys.argv) > 2 else 'dist')

class Server(http.server.ThreadingHTTPServer):
    def server_bind(self):
        socketserver.TCPServer.server_bind(self)
        self.server_name = 'localhost'
        self.server_port = PORT

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        # Never serve dotfiles, such as a .env next to the explorations.
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        if any(part.startswith('.') for part in path.split('/') if part):
            self.send_error(404)
            return None
        return super().send_head()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

Server(('127.0.0.1', PORT), functools.partial(Handler, directory=str(ROOT))).serve_forever()
