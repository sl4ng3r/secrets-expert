import argparse
import io
import tempfile
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist/secrets-expert.mcaddon"


def write_entry(archive, name, data, compression):
    # ZipInfo's fixed timestamp makes builds independent of checkout times.
    entry = zipfile.ZipInfo(name)
    archive.writestr(entry, data, compression)


def addon_bytes():
    result = io.BytesIO()
    with zipfile.ZipFile(result, "w") as addon:
        for directory, name in (
            ("behavior_pack", "secrets-expert-behavior.mcpack"),
            ("resource_pack", "secrets-expert-resources.mcpack"),
        ):
            pack_root = ROOT / directory
            pack_bytes = io.BytesIO()
            with zipfile.ZipFile(pack_bytes, "w") as pack:
                for path in sorted(pack_root.rglob("*")):
                    relative = path.relative_to(pack_root)
                    if path.is_file() and not any(part.startswith(".") for part in relative.parts):
                        write_entry(pack, relative.as_posix(), path.read_bytes(), zipfile.ZIP_DEFLATED)
            write_entry(addon, name, pack_bytes.getvalue(), zipfile.ZIP_STORED)

    return result.getvalue()


def build_addon(output):
    payload = addon_bytes()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent) as staging:
        archive = Path(staging) / output.name
        archive.write_bytes(payload)
        archive.replace(output)


def pack_contents(payload):
    contents = {}
    with zipfile.ZipFile(io.BytesIO(payload)) as addon:
        for entry in addon.infolist():
            if entry.filename in contents:
                raise ValueError(f"Duplicate pack: {entry.filename}")
            with zipfile.ZipFile(io.BytesIO(addon.read(entry))) as pack:
                contents[entry.filename] = files = {}
                for info in pack.infolist():
                    if info.filename in files:
                        raise ValueError(f"Duplicate pack file: {info.filename}")
                    files[info.filename] = pack.read(info)
    return contents


def is_current(output):
    if not output.is_file():
        return False
    try:
        # Compare unpacked files so zlib versions do not affect the drift check.
        return pack_contents(output.read_bytes()) == pack_contents(addon_bytes())
    except (zipfile.BadZipFile, ValueError):
        return False


if __name__ == "__main__":
    cli = argparse.ArgumentParser()
    cli.add_argument("--check", action="store_true", help="Verify the packaged files match the current packs")
    if cli.parse_args().check:
        if not is_current(OUTPUT):
            cli.exit(1, "dist/secrets-expert.mcaddon is outdated. Run python3 tools/build_addon.py.\n")
        print(f"Verified {OUTPUT.relative_to(ROOT)}")
    else:
        build_addon(OUTPUT)
        print(f"Built {OUTPUT.relative_to(ROOT)}")
