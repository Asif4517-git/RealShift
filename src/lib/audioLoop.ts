/** Overlap the tail and head of a loop so its wrap does not jump between
 * unrelated sample values. Shortening by the overlap preserves the join. */
export function crossfadeLoop(channel: Float32Array, sampleRate: number): Float32Array {
  const n = channel.length;
  const overlap = Math.min(Math.floor(sampleRate * 0.012), Math.floor(n / 4));
  if (overlap < 2) return channel.slice();
  const length = n - overlap;
  const result = channel.slice(0, length);
  for (let i = 0; i < overlap; i++) {
    const t = i / (overlap - 1);
    const fade = t * t * (3 - 2 * t);
    result[i] = channel[length + i] * (1 - fade) + channel[i] * fade;
  }
  return result;
}
export function prepareLoop(ctx: BaseAudioContext, source: AudioBuffer): AudioBuffer {
  const channels = Array.from({ length: source.numberOfChannels }, (_, i) => crossfadeLoop(source.getChannelData(i), source.sampleRate));
  const result = ctx.createBuffer(channels.length, channels[0].length, source.sampleRate);
  channels.forEach((data, i) => result.copyToChannel(new Float32Array(data), i));
  return result;
}
