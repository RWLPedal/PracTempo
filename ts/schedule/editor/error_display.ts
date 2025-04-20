export class ErrorDisplay {
  private containerEl: HTMLElement;
  private controlsContainerEl: HTMLElement | null; // Reference to insert before
  private messageElement: HTMLElement | null = null; // Keep track of the message element

  constructor(
    containerEl: HTMLElement,
    controlsContainerEl: HTMLElement | null
  ) {
    this.containerEl = containerEl;
    this.controlsContainerEl = controlsContainerEl;
  }

  public showMessage(
    message: string,
    type: "error" | "warning" | "info" = "error"
  ): void {
    this.removeMessage(); // Remove any existing message first

    const butterbar = document.createElement("div");
    butterbar.textContent = message;
    butterbar.classList.add("butterbar-message", `is-${type}`); // Use this class to check existence
    butterbar.style.padding = "8px 15px";
    butterbar.style.marginBottom = "10px";
    butterbar.style.borderRadius = "4px";
    butterbar.style.border = "1px solid transparent";
    butterbar.style.fontWeight = "bold";

    // Basic styling based on type (can be moved to CSS)
    switch (type) {
      case "error":
        butterbar.style.backgroundColor = "#fdecea";
        butterbar.style.borderColor = "#f14668";
        butterbar.style.color = "#cc0f35";
        break;
      case "warning":
        butterbar.style.backgroundColor = "#fffbeb";
        butterbar.style.borderColor = "#ffdd57";
        butterbar.style.color = "#947600";
        break;
      case "info":
        butterbar.style.backgroundColor = "#eff5fb";
        butterbar.style.borderColor = "#3e8ed0";
        butterbar.style.color = "#296fa8";
        break;
    }

    this.messageElement = butterbar; // Store reference

    if (this.controlsContainerEl && this.containerEl) {
      // Insert the message before the controls container
      this.containerEl.insertBefore(this.messageElement, this.controlsContainerEl);
    } else if (this.containerEl) {
      // Fallback: append to the main container if controls aren't found
      this.containerEl.appendChild(this.messageElement);
      console.warn(
        "ErrorDisplay: Controls container not found, appending message to end."
      );
    } else {
      console.error(
        "ErrorDisplay: Cannot find container to add message:",
        message
      );
      this.messageElement = null; // Failed to add
    }
  }

  public removeMessage(): void {
    if (this.messageElement && this.messageElement.parentNode) {
      this.messageElement.parentNode.removeChild(this.messageElement);
    }
    this.messageElement = null; // Clear reference
  }

  /**
   * Checks if an error/warning/info message is currently displayed.
   * @returns {boolean} True if a message is visible, false otherwise.
   */
  public hasMessage(): boolean {
    // Check if we have a stored reference and if it's still in the DOM
    return !!(this.messageElement && this.messageElement.parentNode);
    // Alternative: Query the DOM directly each time
    // return !!this.containerEl?.querySelector(".butterbar-message");
  }
}