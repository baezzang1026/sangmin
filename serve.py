"""건국일보 로컬 서버: http://localhost:8282 (이 PC에서만 접속 가능)"""
import functools
import http.server
from pathlib import Path

PORT = 8282
ROOT = Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, *args):  # pythonw 에는 콘솔이 없으므로 로그 생략
        pass


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=str(ROOT))
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler).serve_forever()
