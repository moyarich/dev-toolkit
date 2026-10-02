const config = {
  advanceTimers: jest.advanceTimersByTime,
};

const advance = jest.advanceTimersByTime;
jest.advanceTimersByTime(250);

const note = "jest.advanceTimersByTime";
// jest.advanceTimersByTime

export { advance, config };
