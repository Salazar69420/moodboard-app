const GENERATE_URL = 'https://api.wavespeed.ai/api/v3/google/nano-banana-2/edit';
const POLL_URL = 'https://api.wavespeed.ai/api/v3/predictions';
const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = 90_000;

export interface WavespeedResult {
    imageUrl: string;
    taskId: string;
}

/**
 * Generate an image with WaveSpeed Nano Banana 2.
 * Submits the job, then polls until complete.
 */
export async function generateImageWithNanoBanana2(
    piKey: string,
    prompt: string,
    aspectRatio: string = '1:1',
): Promise<WavespeedResult> {
    if (!piKey) throw new Error('Pi Key not set — add it in Settings');

    // Submit generation job
    const submitRes = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${piKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt,
            resolution: '1k',
            aspect_ratio: aspectRatio,
            output_format: 'png',
        }),
    });

    if (!submitRes.ok) {
        let msg = `WaveSpeed error ${submitRes.status}`;
        try {
            const body = await submitRes.json();
            if (body?.message) msg = body.message;
        } catch { /* ignore */ }
        throw new Error(msg);
    }

    const submitData = await submitRes.json();
    const taskId: string = submitData?.data?.id;
    if (!taskId) throw new Error('No task ID returned from WaveSpeed');

    // Poll for completion
    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);

        const pollRes = await fetch(`${POLL_URL}/${taskId}`, {
            headers: { 'Authorization': `Bearer ${piKey}` },
        });

        if (!pollRes.ok) continue; // transient error — keep polling

        const pollData = await pollRes.json();
        const status: string = pollData?.data?.status;
        const outputs: string[] = pollData?.data?.outputs ?? [];

        if (status === 'completed') {
            const imageUrl = outputs[0];
            if (!imageUrl) throw new Error('Generation completed but no output URL');
            return { imageUrl, taskId };
        }

        if (status === 'failed') {
            const reason = pollData?.data?.error ?? 'Generation failed';
            throw new Error(reason);
        }

        // status === 'pending' | 'processing' — keep polling
    }

    throw new Error('Image generation timed out after 90s');
}

function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}
