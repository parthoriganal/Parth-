"""Measured image checks; thresholds flag defects, not artistic merit."""

import numpy as np
from PIL import Image

from blender_pipeline.manifest import PipelineError


MIN_P90 = .345
MAX_MEDIAN = .81
MAX_CLIP = .135


def measure(path, bounds=None):
    """Rec.709-weighted display luma on decoded RGB pixels; frame and bounded hero crop."""
    with Image.open(path) as im:
        rgb = np.asarray(im.convert('RGB'),dtype=np.float32)/255.
    luma = rgb @ np.asarray((.2126,.7152,.0722),dtype=np.float32)
    h,w = luma.shape
    roi=luma
    if bounds:
        xl,yb,xr,yt=bounds
        # Blender NDC y is bottom-to-top; Pillow/NumPy rows are top-to-bottom.
        x0,x1=np.clip(np.round(np.asarray((xl,xr))*w),0,w).astype(int)
        y0,y1=np.clip(np.round((1-np.asarray((yt,yb)))*h),0,h).astype(int)
        if x1-x0>=12 and y1-y0>=12:
            roi = luma[y0:y1,x0:x1]
    p10,med,p90 = np.percentile(roi,[10,50,90])
    edge=(np.abs(np.diff(roi,axis=0)).mean()+np.abs(np.diff(roi,axis=1)).mean())/2
    return {'dimensions':[w,h],'p10':round(float(p10),4),'median':round(float(med),4),
            'p90':round(float(p90),4),'highlight_clip':round(float((roi>=.985).mean()),5),
            'shadow_clip':round(float((roi<=.025).mean()),5),'luma_std':round(float(roi.std()),5),
            'edge_energy':round(float(edge),5),'region_pixels':int(roi.size),
            'global_luma_std':round(float(luma.std()),5)}


def issues(stats):
    out=[]
    if stats['p90'] < MIN_P90:
        out.append('underexposed')
    if stats['median'] > MAX_MEDIAN or stats['highlight_clip'] > MAX_CLIP:
        out.append('overexposed')
    if stats['global_luma_std'] < .026 or stats['edge_energy'] < .0014:
        out.append('low_detail_or_blank')
    return out


def small_luma(path, crop=None):
    with Image.open(path) as im:
        if crop:
            im=im.crop(crop)
        return np.asarray(im.convert('L').resize((240,135),Image.Resampling.LANCZOS),dtype=np.float32)/255.


def pixel_delta(a,b,crop=None):
    return float(np.mean(np.abs(small_luma(a,crop)-small_luma(b,crop))))


def check_frame_metrics(stats):
    problems=issues(stats)
    if problems:
        raise PipelineError(f'Render inspection failed: {problems}; metrics={stats}')
