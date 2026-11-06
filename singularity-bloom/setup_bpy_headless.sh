#!/usr/bin/env bash
# Make Blender 5.0 importable in a bare Linux container.
#
#   pip install bpy==5.0.1        -> ~960 MB wheel, built for CPython 3.11
#   import bpy                    -> ImportError: libXrender.so.1 / libSM ...
#
# The wheel hard-links against X11 client libraries that a headless container
# simply does not ship, and `apt` cannot reach the Debian mirrors here.
# Cycles/CPU rendering never touches those code paths, so empty stub
# libraries (plus a preloaded bag of no-op symbols) are enough to satisfy the
# dynamic loader. If you only ever render with Cycles on CPU this is safe.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
./.venv/bin/pip install --no-cache-dir -q bpy==5.0.1

STUBS="$PWD/.venv/xstubs"
mkdir -p "$STUBS"

# 1. stub libraries for the DT_NEEDED entries that are missing on this image
for lib in libXrender.so.1 libXfixes.so.3 libXi.so.6 libxkbcommon.so.0 \
           libSM.so.6 libICE.so.6 libGL.so.1; do
  [ -f "$STUBS/$lib" ] || gcc -shared -fPIC -o "$STUBS/$lib" -Wl,-soname,"$lib" /dev/null
done

# 2. keep resolving until the loader is satisfied (it reports one symbol at a time)
: > "$STUBS/syms.txt"
build_preload() {
  { echo '#include <stddef.h>'
    while read -r s; do [ -n "$s" ] && echo "void $s(void) {}"; done < "$STUBS/syms.txt"
  } > "$STUBS/stub.c"
  gcc -shared -fPIC -o "$STUBS/libstub.so" "$STUBS/stub.c"
}
build_preload
for _ in $(seq 1 200); do
  out=$(LD_LIBRARY_PATH="$STUBS" LD_PRELOAD="$STUBS/libstub.so" \
        ./.venv/bin/python -c "import bpy" 2>&1 | tail -3 || true)
  if echo "$out" | grep -q "undefined symbol:"; then
    sym=$(echo "$out" | grep -oE "undefined symbol: [A-Za-z0-9_]+" | head -1 | awk '{print $3}')
    echo "$sym" >> "$STUBS/syms.txt"
    build_preload
    echo "  shim: $sym"
  elif echo "$out" | grep -q "cannot open shared object file"; then
    lib=$(echo "$out" | grep -oE "lib[A-Za-z0-9_.+-]+\.so(\.[0-9]+)*: cannot open" | head -1 | sed 's/: cannot open//')
    gcc -shared -fPIC -o "$STUBS/$lib" -Wl,-soname,"$lib" /dev/null
    echo "  shim: $lib"
  else
    break
  fi
done

LD_LIBRARY_PATH="$STUBS" LD_PRELOAD="$STUBS/libstub.so" \
  ./.venv/bin/python -c "import bpy; print('bpy', bpy.app.version_string, 'ready')"
