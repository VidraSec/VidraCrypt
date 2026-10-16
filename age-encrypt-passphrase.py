#!/usr/bin/env python3
"""Encrypt a file with `age -e -p` without typing the passphrase.

Stock age reads the passphrase from the terminal only (no stdin/env option),
so this runs age in a pseudo-terminal and answers both passphrase prompts.
The passphrase is taken from the AGE_PASSPHRASE environment variable (not
argv, so it does not show up in the process list).

Usage: AGE_PASSPHRASE=... age-encrypt-passphrase.py <output-file> <input-file>
"""
import os
import pty
import sys


def main():
    if len(sys.argv) != 3:
        print(__doc__.strip(), file=sys.stderr)
        return 2

    passphrase = os.environ.get("AGE_PASSPHRASE", "")
    if not passphrase:
        # age would autogenerate a different passphrase on empty input.
        print("Error: AGE_PASSPHRASE is empty.", file=sys.stderr)
        return 2

    output_file, input_file = sys.argv[1], sys.argv[2]
    pid, fd = pty.fork()
    if pid == 0:
        try:
            os.execvp("age", ["age", "-e", "-p", "-o", output_file, input_file])
        finally:
            os._exit(127)

    answered = 0
    buf = b""
    while True:
        try:
            data = os.read(fd, 1024)
        except OSError:
            # EIO: child closed the pty
            break
        if not data:
            break
        buf += data
        # Prompts: "Enter passphrase (...): " and "Confirm passphrase: "
        if answered < 2 and buf.lower().rstrip().endswith(b":") and b"passphrase" in buf.lower():
            os.write(fd, passphrase.encode("utf-8") + b"\n")
            answered += 1
            buf = b""

    _, status = os.waitpid(pid, 0)
    exit_code = os.waitstatus_to_exitcode(status)
    if exit_code != 0:
        output = buf.decode("utf-8", "replace").strip()
        print(f"Error: age failed (exit {exit_code}){': ' + output if output else ''}", file=sys.stderr)
        return exit_code or 1
    if answered != 2:
        print(f"Error: expected 2 passphrase prompts from age, got {answered}.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
