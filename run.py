"""Run StudyTool on this machine.

    python run.py            just this computer
    python run.py --lan      also reachable from your iPad on the same Wi-Fi

Hosting is the normal way to use StudyTool. This is here for working offline,
and because it is the quickest way to check a change before uploading it.
"""

import argparse
import socket
import threading
import webbrowser

from server import app

PORT = 8137


def local_ip():
    """This machine's address on the local network, for the --lan hint."""
    probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # No packets are actually sent; this just picks the outbound interface.
        probe.connect(("10.255.255.255", 1))
        return probe.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        probe.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--lan",
        action="store_true",
        help="listen on the local network so other devices can reach it",
    )
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    host = "0.0.0.0" if args.lan else "127.0.0.1"
    url = "http://localhost:%d/" % args.port

    print("StudyTool is running.")
    print("  This computer: %s" % url)
    if args.lan:
        print("  Other devices: http://%s:%d/" % (local_ip(), args.port))
        print("  (Windows will ask once to allow Python through the firewall.)")
    print("\nKeep this window open while you use it. Press Ctrl+C to stop.")

    if not args.no_browser:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    app.run(host=host, port=args.port, debug=False)


if __name__ == "__main__":
    main()
