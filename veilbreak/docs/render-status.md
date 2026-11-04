# VEILBREAK — last render

run `41836922821` · mode `stills` · commit `601c2811bfdbcb502b18ecb65bf4169aa8c538e9`

## `out/render.log`

```

  VEILBREAK — frame renderer
  1600×900 · stills · server :35825

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
File 'veilbreak/docs/ci-stills.png' already exists. Overwrite? [y/N] Not overwriting - exiting
Error opening output file veilbreak/docs/ci-stills.png.
total 37300
drwxr-xr-x 2 runner runner    4096 Nov  4 13:19 .
drwxr-xr-x 3 runner runner    4096 Nov  4 13:20 ..
-rw-r--r-- 1 runner runner 33881 Nov  4 13:18 veilbreak/docs/ci-stills.png
```

## workspace

```
 M veilbreak/docs/render-status.md
```

## out

```
total 20
drwxr-xr-x  3 runner runner 4096 Nov  4 13:20 .
drwxr-xr-x 14 runner runner 4096 Nov  4 13:19 ..
-rw-r--r--  1 runner runner 1400 Nov  4 13:19 render.log
-rw-r--r--  1 runner runner  529 Nov  4 13:20 sheet.log
drwxr-xr-x  2 runner runner 4096 Nov  4 13:19 stills
```

## veilbreak/docs

```
total 272
drwxr-xr-x 2 runner runner  4096 Nov  4 13:18 .
drwxr-xr-x 5 runner runner  4096 Nov  4 13:18 ..
-rw-r--r-- 1 runner runner 33881 Nov  4 13:18 ci-stills.png
-rw-r--r-- 1 runner runner 39150 Nov  4 13:18 proxy-t23.png
-rw-r--r-- 1 runner runner 35636 Nov  4 13:18 proxy-t44.png
-rw-r--r-- 1 runner runner 24897 Nov  4 13:18 proxy-t6.png
-rw-r--r-- 1 runner runner 34399 Nov  4 13:18 proxy-t60.png
-rw-r--r-- 1 runner runner 35477 Nov  4 13:18 proxy-t64_5.png
-rw-r--r-- 1 runner runner 37399 Nov  4 13:18 proxy-t90.png
-rw-r--r-- 1 runner runner  2476 Nov  4 13:20 render-status.md
-rw-r--r-- 1 runner runner  6257 Nov  4 13:18 storyboard.md
```
