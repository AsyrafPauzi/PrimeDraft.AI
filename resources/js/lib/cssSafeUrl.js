/** Safe CSS url("…") wrapper for URLs that may contain ) or quotes (e.g. data: URLs). */
export function cssUrlValue(uri) {
    if (!uri || typeof uri !== 'string') {
        return undefined;
    }
    const escaped = uri.replace(/\\/g, '\\\\').replace(/\n/g, '').replace(/"/g, '\\"');
    return `url("${escaped}")`;
}
