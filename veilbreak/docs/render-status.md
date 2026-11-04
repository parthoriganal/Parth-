# VEILBREAK — last render

run `41836523188` · mode `stills` · commit `c75152f8ad62ee514989bba5a5ed00e53d3c104f`

## `out/render.log`

```

  VEILBREAK — frame renderer
  1600×900 · stills · server :33019

  story time: 96s · renderer: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)

  t=    1s  luma mean 0.102 max 0.308  → still_00_1s.png
  t=    6s  luma mean 0.315 max 0.953  → still_01_6s.png
  t=   12s  luma mean 0.331 max 0.961  → still_02_12s.png
  t=   18s  luma mean 0.384 max 0.954  → still_03_18s.png
  t=   23s  luma mean 0.378 max 0.979  → still_04_23s.png
  t=   28s  luma mean 0.375 max 0.983  → still_05_28s.png
  t=   34s  luma mean 0.416 max 0.988  → still_06_34s.png
  t=   40s  luma mean 0.502 max 0.992  → still_07_40s.png
  t=   46s  luma mean 0.612 max 1.000  → still_08_46s.png
  t=   52s  luma mean 0.592 max 1.000  → still_09_52s.png
  t=   58s  luma mean 0.717 max 1.000  → still_10_58s.png
  t=   61s  luma mean 0.887 max 1.000  → still_11_61s.png
  t= 62.4s  luma mean 0.934 max 0.976  → still_12_62_4s.png
  t= 64.5s  luma mean 0.549 max 0.956  → still_13_64_5s.png
  t=   70s  luma mean 0.494 max 0.952  → still_14_70s.png
  t=   78s  luma mean 0.490 max 0.939  → still_15_78s.png
  t=   84s  luma mean 0.514 max 0.950  → still_16_84s.png
  t=   88s  luma mean 0.510 max 0.957  → still_17_88s.png
  t=   92s  luma mean 0.503 max 0.942  → still_18_92s.png

  determinism: frame @23s re-painted identical
  stills OK

```

## `out/sheet.log`

```
Input #0, image2, from 'out/stills/*.png':
  Duration: 00:00:00.76, start: 0.000000, bitrate: N/A
  Stream #0:0: Video: png, rgb24(pc, gbr/unknown/unknown), 1600x900, 25 fps, 25 tbr, 25 tbn
Stream mapping:
  Stream #0:0 -> #0:0 (png (native) -> png (native))
Press [q] to stop, [?] for help
Output #0, image2, to 'veilbreak/docs/ci-stills.png':
  Metadata:
    encoder         : Lavf62.3.100
  Stream #0:0: Video: png, rgb24(pc, gbr/unknown/unknown, progressive), 2424x1098, q=2-31, 200 kb/s, 1.25 fps, 1.25 tbn
    Metadata:
      encoder         : Lavc62.11.100 png
[out#0/image2 @ 0x630e35841d00] video:33KiB audio:0KiB subtitle:0KiB other streams:0KiB global headers:0KiB muxing overhead: unknown
frame=    1 fps=0.0 q=-0.0 Lsize=N/A time=00:00:00.80 bitrate=N/A speed=6.79x elapsed=0:00:00.11    
total 388
drwxr-xr-x 2 runner runner  4096 Nov  4 13:17 .
drwxr-xr-x 3 runner runner  4096 Nov  4 13:17 ..
-rw-r--r-- 1 runner runner 33881 Nov  4 13:17 veilbreak/docs/ci-stills.png
```

## workspace

```
 M veilbreak/docs/render-status.md
?? veilbreak/docs/ci-stills.png
```

## out

```
total 20
drwxr-xr-x  3 runner runner 4096 Nov  4 13:17 .
drwxr-xr-x 14 runner runner 4096 Nov  4 13:17 ..
-rw-r--r--  1 runner runner 1400 Nov  4 13:17 render.log
-rw-r--r--  1 runner runner  984 Nov  4 13:17 sheet.log
drwxr-xr-x  2 runner runner 4096 Nov  4 13:17 stills
```

## veilbreak/docs

```
total 272
drwxr-xr-x 2 runner runner  4096 Nov  4 13:17 .
drwxr-xr-x 5 runner runner  4096 Nov  4 13:16 ..
-rw-r--r-- 1 runner runner 33881 Nov  4 13:17 ci-stills.png
-rw-r--r-- 1 runner runner 39150 Nov  4 13:16 proxy-t23.png
-rw-r--r-- 1 runner runner 35636 Nov  4 13:16 proxy-t44.png
-rw-r--r-- 1 runner runner 24897 Nov  4 13:16 proxy-t6.png
-rw-r--r-- 1 runner runner 34399 Nov  4 13:16 proxy-t60.png
-rw-r--r-- 1 runner runner 35477 Nov  4 13:16 proxy-t64_5.png
-rw-r--r-- 1 runner runner 37399 Nov  4 13:16 proxy-t90.png
-rw-r--r-- 1 runner runner  2963 Nov  4 13:17 render-status.md
-rw-r--r-- 1 runner runner  6257 Nov  4 13:16 storyboard.md
```
