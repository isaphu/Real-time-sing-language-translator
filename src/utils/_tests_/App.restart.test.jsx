import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";

// Helpers
const startFlow = async () => {
  render(<App />);
  // step 0 > click Start on Terms
  const startBtn = await screen.findByRole("button", { name: /start/i });
  await userEvent.click(startBtn);
  // now on Step 1 (Translation) > click Close > confirm to Step 2
  const closeBtn = await screen.findByRole("button", { name: /close/i });
  await userEvent.click(closeBtn);
  const endBtn = await screen.findByRole("button", { name: /end translation/i });
  await userEvent.click(endBtn);
  // on Step 2 (Complete)
};

describe("Restart flow", () => {
  test("shows warning if NOT exported", async () => {
    await startFlow();
    const startNew = await screen.findByRole("button", { name: /start new translation/i });
    await userEvent.click(startNew);

    // Warning modal should appear
    expect(await screen.findByText(/would you like to export it first/i)).toBeInTheDocument();
  });

  test("no warning after export", async () => {
    await startFlow();

    // Export first
    const exportBtn = await screen.findByRole("button", { name: /export chat/i });
    await userEvent.click(exportBtn);

    // Now Start New should jump to Terms without warning
    const startNew = await screen.findByRole("button", { name: /start new translation/i });
    await userEvent.click(startNew);

    // Terms content should be visible (no warning modal)
    expect(screen.queryByText(/would you like to export it first/i)).not.toBeInTheDocument();
    expect(await screen.findByText(/terms/i)).toBeInTheDocument();
  });
});
