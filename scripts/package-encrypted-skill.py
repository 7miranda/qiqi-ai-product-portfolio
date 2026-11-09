#!/usr/bin/env python3
"""Build a password-protected Skill ZIP; keep the password file outside the repository.

Requires pyzipper 0.4.0. Pass a private password-file path, never a password argument.
The receipt contains hashes and validation results, never the password.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets

import pyzipper


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--password-file", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    args = parser.parse_args()
    source = args.source.resolve(strict=True)
    project = Path(__file__).resolve().parents[1]
    password_path = args.password_file.resolve()
    if password_path.is_relative_to(project):
        raise ValueError("The private password file must be outside the public repository")
    if not (source / "SKILL.md").is_file():
        raise ValueError("The package must contain SKILL.md")

    files = sorted(path for path in source.rglob("*") if path.is_file() or path.is_symlink())
    for path in files:
        if path.is_symlink() or any(part.startswith(".") for part in path.relative_to(source).parts):
            raise ValueError(f"Unexpected hidden or linked package resource: {path.name}")
    password_path.parent.mkdir(parents=True, exist_ok=True)
    if not password_path.exists():
        descriptor = os.open(password_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w") as handle:
            handle.write("77-" + secrets.token_urlsafe(15) + "\n")
    password = password_path.read_bytes().strip()
    if len(password) < 16:
        raise ValueError("Use a password of at least 16 bytes")
    os.chmod(password_path, 0o600)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with pyzipper.AESZipFile(args.output, "w", compression=pyzipper.ZIP_DEFLATED) as archive:
        archive.setpassword(password)
        archive.setencryption(pyzipper.WZ_AES, nbits=256)
        for path in files:
            archive.write(path, arcname=str(Path(source.name) / path.relative_to(source)))

    with pyzipper.AESZipFile(args.output) as archive:
        first = archive.namelist()[0]
        for candidate in (None, password + b"-incorrect"):
            try:
                archive.read(first, pwd=candidate)
            except RuntimeError:
                pass
            else:
                raise AssertionError("The ZIP allowed missing or incorrect credentials")
        for path in files:
            name = str(Path(source.name) / path.relative_to(source))
            if archive.read(name, pwd=password) != path.read_bytes():
                raise AssertionError(f"Decrypted bytes differ: {name}")

    data = args.output.read_bytes()
    receipt = {
        "fileName": args.output.name,
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "files": [str(Path(source.name) / path.relative_to(source)) for path in files],
        "encryption": "WinZip AES-256",
        "missingPasswordRejected": True,
        "wrongPasswordRejected": True,
        "correctPasswordRestoresEveryFile": True,
    }
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    args.receipt.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(receipt, ensure_ascii=False))


if __name__ == "__main__":
    main()
