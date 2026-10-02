import { vi, type Mock } from "vitest";
const vscode = {
  window: {
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
  },
};

(vscode.window.showWarningMessage as Mock)
  .mockReset()
  .mockResolvedValue(undefined);

export default vscode;
