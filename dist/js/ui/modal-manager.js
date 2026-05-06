// js/ui/modal-manager.ts
// Centralized modal manager: one open at a time, Escape to close. No timer pause.
export class ModalManager {
    stack = [];
    escapeHandler = null;
    constructor() {
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.stack.length > 0) {
                this.closeTop();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }
    open(modal) {
        if (this.stack.length > 0) {
            this.stack[this.stack.length - 1].style.display = 'none';
        }
        this.stack.push(modal);
        modal.style.display = 'flex';
    }
    closeTop() {
        const modal = this.stack.pop();
        if (modal) {
            modal.style.display = 'none';
        }
        if (this.stack.length > 0) {
            this.stack[this.stack.length - 1].style.display = 'flex';
        }
    }
    close(modal) {
        const index = this.stack.indexOf(modal);
        if (index === -1)
            return;
        this.stack.splice(index, 1);
        modal.style.display = 'none';
        if (this.stack.length > 0 && index === this.stack.length) {
            this.stack[this.stack.length - 1].style.display = 'flex';
        }
    }
    closeAll() {
        while (this.stack.length > 0) {
            const modal = this.stack.pop();
            modal.style.display = 'none';
        }
    }
    get isOpen() {
        return this.stack.length > 0;
    }
    destroy() {
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }
    }
}
