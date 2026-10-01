const vscode = {
  window: {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
  },
};

(vscode.window.showWarningMessage as jest.Mock)
  .mockReset()
  .mockResolvedValue(undefined);

export default vscode;
