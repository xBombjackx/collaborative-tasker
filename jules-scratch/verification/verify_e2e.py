from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Capture console messages
    messages = []
    page.on("console", lambda msg: messages.append(msg))

    # Go to the test page
    page.goto("http://localhost:3000/.sdk/index.html")

    # 1. Wait for the initial widget to render
    expect(page.locator("#task-lists-container .task-list")).to_have_count(2)

    # 2. Use the controls to add a new list
    new_list_name = "My New E2E List"
    page.locator("#list-name-input").fill(new_list_name)
    page.locator("#add-list-button").click()

    # 3. Verify that the new list appears in the widget view
    try:
        new_list_locator = page.locator(f"#task-lists-container .task-list h2:has-text('{new_list_name}')")
        expect(new_list_locator).to_be_visible(timeout=5000)
    except Exception as e:
        print("Verification failed. Printing console output:")
        for msg in messages:
            print(f"[{msg.type}] {msg.text}")
        raise e

    # 4. Take a screenshot for final confirmation
    page.screenshot(path="jules-scratch/verification/e2e-verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)