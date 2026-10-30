/**
 * export.js — encode the film to MP4 in the browser, no server.
 *
 * Because the timeline is deterministic we can drive it frame by frame,
 * hand each frame to WebCodecs, and mux the result with mp4-muxer.
 * 864 frames at 1080p24 → a real, seekable H.264 file with fast-start
 * metadata, produced entirely on the client.
 */

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export function canExport() {
	return (
		typeof window !== 'undefined' &&
		typeof window.VideoEncoder !== 'undefined' &&
		typeof window.VideoFrame !== 'undefined' &&
		typeof window.EncodedVideoChunk !== 'undefined'
	);
}

const CODECS = [
	'avc1.64002a', // High 4.2 — 1080p30
	'avc1.640028', // High 4.0
	'avc1.4d0028', // Main 4.0
	'avc1.42e028' // Baseline 4.0
];

async function pickCodec(width, height, fps, bitrate) {
	for (const codec of CODECS) {
		const config = { codec, width, height, bitrate, framerate: fps };
		try {
			const support = await VideoEncoder.isConfigSupported(config);
			if (support && support.supported) return config;
		} catch {
			/* try the next profile */
		}
	}
	return null;
}

/**
 * @param {object} opts
 * @param {(frame:number)=>void} opts.renderFrame  synchronous paint of frame N
 * @param {number} opts.frames
 * @param {number} opts.fps
 * @param {HTMLCanvasElement} opts.canvas
 * @param {(progress:{frame:number,frames:number})=>void} [opts.onProgress]
 * @returns {Promise<{blob:Blob, url:string, bytes:number, codec:string}>}
 */
export async function exportFilm({
	renderFrame,
	frames,
	fps,
	canvas,
	width = 1920,
	height = 1080,
	bitrate = 12_000_000,
	keyEvery = 48,
	onProgress
}) {
	if (!canExport()) throw new Error('This browser has no WebCodecs — use Chrome or Edge.');

	const config = await pickCodec(width, height, fps, bitrate);
	if (!config) throw new Error('No H.264 encoder available in this browser.');

	const muxer = new Muxer({
		target: new ArrayBufferTarget(),
		video: { codec: 'avc', width, height, frameRate: fps },
		fastStart: 'in-memory'
	});

	let encoderError = null;

	const encoder = new VideoEncoder({
		output: (chunk, meta) => {
			try {
				muxer.addVideoChunk(chunk, meta);
			} catch (err) {
				encoderError = err;
			}
		},
		error: (err) => {
			encoderError = err;
		}
	});

	encoder.configure(config);

	const frameDuration = Math.round(1_000_000 / fps);

	for (let i = 0; i < frames; i++) {
		if (encoderError) throw encoderError;

		renderFrame(i);

		const videoFrame = new VideoFrame(canvas, {
			timestamp: Math.round((i * 1_000_000) / fps),
			duration: frameDuration
		});

		encoder.encode(videoFrame, { keyFrame: i % keyEvery === 0 });
		videoFrame.close();

		// keep the encoder queue shallow so memory stays flat
		while (encoder.encodeQueueSize > 8) {
			await new Promise((r) => setTimeout(r, 0));
			if (encoderError) throw encoderError;
		}

		if (i % 6 === 0) {
			if (onProgress) onProgress({ frame: i + 1, frames });
			await new Promise((r) => setTimeout(r, 0));
		}
	}

	await encoder.flush();
	encoder.close();

	if (encoderError) throw encoderError;

	muxer.finalize();

	const { buffer } = muxer.target;
	const blob = new Blob([buffer], { type: 'video/mp4' });

	if (onProgress) onProgress({ frame: frames, frames, done: true });

	return {
		blob,
		url: URL.createObjectURL(blob),
		bytes: blob.size,
		codec: config.codec
	};
}
