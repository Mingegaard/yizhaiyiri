#!/bin/zsh
cd -- "$(dirname "$0")" || exit 1
python3 - <<'PY'
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os, webbrowser
os.chdir(Path.cwd() / 'dist')
url = 'http://127.0.0.1:5174/?demo=1'
try:
    server = ThreadingHTTPServer(('127.0.0.1', 5174), SimpleHTTPRequestHandler)
except OSError:
    print('5174 端口正在使用。如果游戏已启动，请打开：' + url)
    input('按回车关闭此窗口。')
else:
    print('游戏已启动：' + url + '\n关闭此窗口即可停止游戏。')
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
PY
