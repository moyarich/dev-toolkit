import cssText from "./cursor-overlay-element-style.css?inline";

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(cssText);

export class CursorOverlay extends HTMLElement {
  static tagName = "moyarich-cursor-overlay";
  static styleSheets = [styleSheet];

  #cursor: HTMLDivElement;

  #handleMouseMove = (event: MouseEvent): void => {
    this.#cursor.style.translate = `${event.clientX}px ${event.clientY}px`;
  };

  #handleMouseDown = (): void => {
    this.#cursor.classList.remove("click");
    void this.#cursor.offsetWidth;
    this.#cursor.classList.add("click");
  };

  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.adoptedStyleSheets = CursorOverlay.styleSheets;

    this.#cursor = document.createElement("div");
    this.#cursor.className = "cursor";

    const halo = document.createElement("span");
    halo.className = "cursor__halo";
    this.#cursor.append(halo);
    shadowRoot.append(this.#cursor);
  }

  connectedCallback(): void {
    this.setAttribute("popover", "manual");

    if (!this.matches(":popover-open")) {
      this.showPopover();
    }

    document.addEventListener("mousemove", this.#handleMouseMove, true);
    document.addEventListener("mousedown", this.#handleMouseDown, true);
  }

  disconnectedCallback(): void {
    document.removeEventListener("mousemove", this.#handleMouseMove, true);
    document.removeEventListener("mousedown", this.#handleMouseDown, true);
  }
}

if (!customElements.get(CursorOverlay.tagName)) {
  customElements.define(CursorOverlay.tagName, CursorOverlay);
}
