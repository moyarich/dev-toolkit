import styleSheet from "./styles.css" with { type: "css" };

/**
 * Visual cursor magnifier that mirrors the rendered DOM beneath the pointer.
 *
 * The clone is intentionally visual-only: computed styles, live form values,
 * scroll positions, canvas pixels, and native text selection are preserved so
 * the lens reflects what the user can currently see.
 */
export class MagnifierCursorOverlay extends HTMLElement {
  static tagName = "moyarich-magnifier-cursor-overlay";
  static styleSheets = [styleSheet];
  static maxDepth = 12;
  static maxTargetSize = 1.5;

  #cursor;
  #content;
  #selectionLayer;
  #target = null;
  #clone = null;
  #x = 0;
  #y = 0;
  #pointerVisible = false;
  #clickTimer;
  #pointerFrame;
  #selectionFrame;
  #refreshFrame;
  #mutationFrame;
  #mutationObserver = new MutationObserver(() => this.#queueMutationRefresh());

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.adoptedStyleSheets = MagnifierCursorOverlay.styleSheets;

    this.#cursor = document.createElement("div");
    this.#cursor.className = "cursor";
    this.#content = document.createElement("div");
    this.#content.className = "cursor__content";
    this.#selectionLayer = document.createElement("div");
    this.#selectionLayer.className = "cursor__selection-layer";
    this.#content.append(this.#selectionLayer);
    this.#cursor.append(this.#content);
    root.append(this.#cursor);
  }

  #getScale() {
    return (
      Number.parseFloat(
        getComputedStyle(this.#cursor).getPropertyValue("--cursor-scale"),
      ) || 1.3
    );
  }

  #getSize() {
    return this.#content.offsetWidth || this.#cursor.offsetWidth || 1;
  }

  #getParent(element) {
    if (!element) return null;
    if (element.parentElement) return element.parentElement;
    const root = element.getRootNode?.();
    return root instanceof ShadowRoot && root.host instanceof Element
      ? root.host
      : null;
  }

  #elementFromPoint(x, y) {
    let element = document.elementFromPoint(x, y);
    while (element?.shadowRoot) {
      const nested = element.shadowRoot.elementFromPoint(x, y);
      if (!nested || nested === element) break;
      element = nested;
    }
    return element instanceof Element ? element : null;
  }

  #hasEnoughArea(element) {
    const rect = element.getBoundingClientRect();
    const radius = this.#getSize() / this.#getScale() / 2;
    const localX = this.#x - rect.left;
    const localY = this.#y - rect.top;
    return (
      localX >= radius &&
      localY >= radius &&
      rect.width - localX >= radius &&
      rect.height - localY >= radius
    );
  }

  #getTarget() {
    let element = this.#elementFromPoint(this.#x, this.#y);
    let fallback = null;

    for (
      let depth = 0;
      element && depth < MagnifierCursorOverlay.maxDepth;
      depth += 1
    ) {
      if (
        element === this ||
        element === document.body ||
        element === document.documentElement ||
        element.contains(this)
      )
        break;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        element = this.#getParent(element);
        continue;
      }
      if (
        rect.width > innerWidth * MagnifierCursorOverlay.maxTargetSize ||
        rect.height > innerHeight * MagnifierCursorOverlay.maxTargetSize
      )
        break;
      fallback = element;
      if (this.#hasEnoughArea(element)) return element;
      element = this.#getParent(element);
    }
    return fallback;
  }

  #isTransparent(color) {
    return (
      !color ||
      color === "transparent" ||
      color === "rgba(0, 0, 0, 0)" ||
      color === "rgba(0,0,0,0)"
    );
  }

  #getBackground(element) {
    let current = element;
    for (
      let depth = 0;
      current && depth < MagnifierCursorOverlay.maxDepth;
      depth += 1
    ) {
      const style = getComputedStyle(current);
      if (style.backgroundImage && style.backgroundImage !== "none")
        return style.background;
      if (!this.#isTransparent(style.backgroundColor))
        return style.backgroundColor;
      current = this.#getParent(current);
    }
    for (const fallback of [document.body, document.documentElement]) {
      const style = getComputedStyle(fallback);
      if (style.backgroundImage && style.backgroundImage !== "none")
        return style.background;
      if (!this.#isTransparent(style.backgroundColor))
        return style.backgroundColor;
    }
    return "#fff";
  }

  #removeIds(root) {
    root.removeAttribute?.("id");
    root
      .querySelectorAll?.("[id]")
      .forEach((element) => element.removeAttribute("id"));
  }

  #copyComputedStyles(source, clone) {
    const sources = [source, ...source.querySelectorAll("*")];
    const clones = [clone, ...clone.querySelectorAll("*")];
    sources.forEach((element, index) => {
      const copy = clones[index];
      if (!copy) return;
      const computed = getComputedStyle(element);
      for (const property of computed)
        copy.style.setProperty(property, computed.getPropertyValue(property));
    });
  }

  #copyControlState(source, clone) {
    if (
      source instanceof HTMLInputElement &&
      clone instanceof HTMLInputElement
    ) {
      clone.value = source.value;
      clone.checked = source.checked;
    } else if (
      source instanceof HTMLTextAreaElement &&
      clone instanceof HTMLTextAreaElement
    ) {
      clone.value = source.value;
    } else if (
      source instanceof HTMLSelectElement &&
      clone instanceof HTMLSelectElement
    ) {
      [...source.options].forEach((option, index) => {
        if (clone.options[index])
          clone.options[index].selected = option.selected;
      });
    }
  }

  #copyFormState(source, clone) {
    this.#copyControlState(source, clone);
    const sources = source.querySelectorAll?.("input, textarea, select") ?? [];
    const clones = clone.querySelectorAll?.("input, textarea, select") ?? [];
    sources.forEach(
      (element, index) =>
        clones[index] && this.#copyControlState(element, clones[index]),
    );
  }

  #copyScrollState(source, clone) {
    const sources = [source, ...(source.querySelectorAll?.("*") ?? [])];
    const clones = [clone, ...(clone.querySelectorAll?.("*") ?? [])];
    sources.forEach((element, index) => {
      if (!clones[index]) return;
      clones[index].scrollLeft = element.scrollLeft;
      clones[index].scrollTop = element.scrollTop;
    });
  }

  #copyCanvasState(source, clone) {
    const sources = [
      ...(source instanceof HTMLCanvasElement ? [source] : []),
      ...(source.querySelectorAll?.("canvas") ?? []),
    ];
    const clones = [
      ...(clone instanceof HTMLCanvasElement ? [clone] : []),
      ...(clone.querySelectorAll?.("canvas") ?? []),
    ];
    sources.forEach((canvas, index) => {
      const copy = clones[index];
      if (!copy) return;
      copy.width = canvas.width;
      copy.height = canvas.height;
      const context = copy.getContext("2d");
      if (!context) return;
      try {
        context.drawImage(canvas, 0, 0);
      } catch {
        /* Visual fallback for tainted/unsupported canvases. */
      }
    });
  }

  #createClone(target) {
    const rect = target.getBoundingClientRect();
    const clone = target.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return null;

    this.#copyComputedStyles(target, clone);
    this.#removeIds(clone);
    clone.classList.add("cursor__clone");
    clone.setAttribute("aria-hidden", "true");
    clone.style.boxSizing = "border-box";
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.maxWidth = "none";
    clone.style.maxHeight = "none";
    clone.style.margin = "0";
    clone.style.pointerEvents = "none";
    clone.style.userSelect = "none";
    clone.style.webkitUserSelect = "none";

    this.#copyFormState(target, clone);
    this.#copyCanvasState(target, clone);
    return clone;
  }

  #observeTarget() {
    this.#mutationObserver.disconnect();
    if (this.#target?.isConnected) {
      this.#mutationObserver.observe(this.#target, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
    }
  }

  #setTarget(nextTarget, { force = false } = {}) {
    if (!force && nextTarget === this.#target) return;
    this.#target = nextTarget;
    this.#clone?.remove();
    this.#clone = null;
    this.#selectionLayer.replaceChildren();
    this.#observeTarget();

    if (!nextTarget) {
      this.#cursor.classList.remove("visible");
      return;
    }

    const clone = this.#createClone(nextTarget);
    if (!clone) return;
    this.#clone = clone;
    this.#content.insertBefore(clone, this.#selectionLayer);
    this.#copyScrollState(nextTarget, clone);
    this.#cursor.style.setProperty(
      "--cursor-background",
      this.#getBackground(nextTarget),
    );
    if (this.#pointerVisible) this.#cursor.classList.add("visible");
  }

  #getTransform() {
    if (!this.#target) return "";
    const rect = this.#target.getBoundingClientRect();
    const scale = this.#getScale();
    const radius = this.#getSize() / 2;
    return `translate(${radius - (this.#x - rect.left) * scale}px, ${radius - (this.#y - rect.top) * scale}px) scale(${scale})`;
  }

  #positionLayers() {
    if (!this.#target || !this.#clone) return;
    const transform = this.#getTransform();
    this.#clone.style.transform = transform;
    this.#selectionLayer.style.transform = transform;
  }

  #updateSelection() {
    this.#selectionLayer.replaceChildren();
    if (!this.#target || !this.#clone) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0)
      return;

    const targetRect = this.#target.getBoundingClientRect();
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < selection.rangeCount; i += 1) {
      for (const rect of selection.getRangeAt(i).getClientRects()) {
        const left = Math.max(rect.left, targetRect.left);
        const top = Math.max(rect.top, targetRect.top);
        const right = Math.min(rect.right, targetRect.right);
        const bottom = Math.min(rect.bottom, targetRect.bottom);
        if (right <= left || bottom <= top) continue;
        const highlight = document.createElement("div");
        highlight.className = "cursor__selection-rect";
        highlight.style.left = `${left - targetRect.left}px`;
        highlight.style.top = `${top - targetRect.top}px`;
        highlight.style.width = `${right - left}px`;
        highlight.style.height = `${bottom - top}px`;
        fragment.append(highlight);
      }
    }
    this.#selectionLayer.append(fragment);
  }

  #renderPointer = () => {
    this.#pointerFrame = undefined;
    this.#cursor.style.left = `${this.#x}px`;
    this.#cursor.style.top = `${this.#y}px`;
    this.#setTarget(this.#getTarget());
    if (!this.#target || !this.#clone) return;
    this.#positionLayers();
    this.#updateSelection();
    this.#cursor.classList.add("visible");
  };

  #handlePointerMove = (event) => {
    this.#x = event.clientX;
    this.#y = event.clientY;
    this.#pointerVisible = true;
    if (this.#pointerFrame === undefined)
      this.#pointerFrame = requestAnimationFrame(this.#renderPointer);
  };

  #queueSelectionUpdate = () => {
    if (this.#selectionFrame !== undefined) return;
    this.#selectionFrame = requestAnimationFrame(() => {
      this.#selectionFrame = undefined;
      this.#updateSelection();
    });
  };

  #queueRefresh = () => {
    if (!this.#pointerVisible || this.#refreshFrame !== undefined) return;
    this.#refreshFrame = requestAnimationFrame(() => {
      this.#refreshFrame = undefined;
      this.#setTarget(this.#getTarget(), { force: true });
      this.#positionLayers();
      this.#updateSelection();
    });
  };

  #queueMutationRefresh() {
    if (!this.#pointerVisible || this.#mutationFrame !== undefined) return;
    this.#mutationFrame = requestAnimationFrame(() => {
      this.#mutationFrame = undefined;
      if (!this.#target?.isConnected) {
        this.#setTarget(null);
        return;
      }
      this.#setTarget(this.#target, { force: true });
      this.#positionLayers();
      this.#updateSelection();
    });
  }

  #handlePointerDown = () => {
    this.#cursor.classList.remove("click");
    void this.#cursor.offsetWidth;
    this.#cursor.classList.add("click");
    clearTimeout(this.#clickTimer);
    this.#clickTimer = setTimeout(
      () => this.#cursor.classList.remove("click"),
      500,
    );
  };

  #hide = () => {
    this.#pointerVisible = false;
    this.#cursor.classList.remove("visible");
  };

  connectedCallback() {
    this.setAttribute("popover", "manual");
    if (!this.matches(":popover-open")) this.showPopover();
    document.addEventListener("pointermove", this.#handlePointerMove, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointerdown", this.#handlePointerDown, {
      capture: true,
      passive: true,
    });
    document.addEventListener("selectionchange", this.#queueSelectionUpdate);
    document.addEventListener("scroll", this.#queueRefresh, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", this.#queueRefresh, { passive: true });
    document.addEventListener("pointerleave", this.#hide);
    window.addEventListener("blur", this.#hide);
  }

  disconnectedCallback() {
    document.removeEventListener("pointermove", this.#handlePointerMove, true);
    document.removeEventListener("pointerdown", this.#handlePointerDown, true);
    document.removeEventListener("selectionchange", this.#queueSelectionUpdate);
    document.removeEventListener("scroll", this.#queueRefresh, true);
    window.removeEventListener("resize", this.#queueRefresh);
    document.removeEventListener("pointerleave", this.#hide);
    window.removeEventListener("blur", this.#hide);
    this.#mutationObserver.disconnect();
    clearTimeout(this.#clickTimer);
    for (const frame of [
      this.#pointerFrame,
      this.#selectionFrame,
      this.#refreshFrame,
      this.#mutationFrame,
    ]) {
      if (frame !== undefined) cancelAnimationFrame(frame);
    }
    this.#pointerFrame =
      this.#selectionFrame =
      this.#refreshFrame =
      this.#mutationFrame =
        undefined;
    this.#target = null;
    this.#clone?.remove();
    this.#clone = null;
    this.#selectionLayer.replaceChildren();
  }
}

if (!customElements.get(MagnifierCursorOverlay.tagName)) {
  customElements.define(MagnifierCursorOverlay.tagName, MagnifierCursorOverlay);
}
