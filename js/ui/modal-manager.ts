// js/ui/modal-manager.ts
// Centralized modal manager: one open at a time, Escape to close. No timer pause.

export class ModalManager {
  private stack: HTMLElement[] = [];
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.stack.length > 0) {
        this.closeTop();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
  }

  open(modal: HTMLElement): void {
    if (this.stack.length > 0) {
      this.stack[this.stack.length - 1].style.display = 'none';
    }
    this.stack.push(modal);
    modal.style.display = 'flex';
  }

  closeTop(): void {
    const modal = this.stack.pop();
    if (modal) {
      modal.style.display = 'none';
    }
    if (this.stack.length > 0) {
      this.stack[this.stack.length - 1].style.display = 'flex';
    }
  }

  close(modal: HTMLElement): void {
    const index = this.stack.indexOf(modal);
    if (index === -1) return;
    this.stack.splice(index, 1);
    modal.style.display = 'none';
    if (this.stack.length > 0 && index === this.stack.length) {
      this.stack[this.stack.length - 1].style.display = 'flex';
    }
  }

  closeAll(): void {
    while (this.stack.length > 0) {
      const modal = this.stack.pop()!;
      modal.style.display = 'none';
    }
  }

  get isOpen(): boolean {
    return this.stack.length > 0;
  }

  destroy(): void {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }
  }
}
