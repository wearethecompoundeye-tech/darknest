// js/core/dom-helper.ts
export function el(id) {
    return document.getElementById(id);
}
export function elRequired(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Required element #${id} not found`);
    }
    return element;
}
