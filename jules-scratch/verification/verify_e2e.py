import time
from playwright.sync_api import sync_playwright, expect


def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    # Use context managers for robust resource cleanup
    with browser.new_context() as context:
        with context.new_page() as page:
            # Capture console messages
            messages = []
            page.on("console", lambda msg: messages.append(msg))

            # Go to the test page
            page.goto("http://localhost:3000/.sdk/index.html")

            # 1. Wait for the initial widget to render
            expect(page.locator("#task-lists-container .task-list")).to_have_count(2)

            # 2. Use the controls to add a new list
            # Use a unique name to ensure test isolation
            new_list_name = f"My New E2E List - {int(time.time())}"
            page.locator("#list-name-input").fill(new_list_name)
            page.locator("#add-list-button").click()

            # 3. Verify that the new list appears in the widget view
            try:
                # Using get_by_role for the heading is slightly more robust
                new_list_locator = page.get_by_role(
                    "heading", name=new_list_name, exact=True
                )
                expect(new_list_locator).to_be_visible(timeout=5000)
            except Exception as e:
                print("Verification failed. Printing console output:")
                for msg in messages:
                    # Filter out potential noise from verbose console logs if needed
                    if msg.type in ["error", "warning", "log"]:
                        print(f"[{msg.type.upper()}] {msg.text}")
                raise e

            # 4. Take a screenshot for final confirmation
            page.screenshot(path="jules-scratch/verification/e2e-verification.png")

    browser.close()


with sync_playwright() as playwright:
    run(playwright)
