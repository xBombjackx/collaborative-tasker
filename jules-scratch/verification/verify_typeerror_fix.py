from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for console messages
    page.on("console", lambda msg: print(f"Browser console: {msg.text()}"))

    try:
        page.goto("http://localhost:3000")

        # Wait for the page and iframe to load
        iframe = page.frame_locator("#widget-iframe")
        iframe.locator("#main-container").wait_for(timeout=10000)

        # 1. Use the command emulator to add a task with a single-word name
        page.fill("#command-username-input", "TestUser")
        page.select_option("#command-role-select", "mod")
        page.fill("#command-input", "!addtask 'Stream Goals' MyTestTask")
        page.click("#emulate-command-button")

        # 2. Verify the task appears in the main task list in the widget
        task_selector = "text=MyTestTask"
        expect(iframe.locator(task_selector)).to_be_visible(timeout=5000)

        # 3. Take a screenshot to verify the final state
        page.screenshot(path="jules-scratch/verification/verification.png", full_page=True)
        print("Screenshot taken successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)