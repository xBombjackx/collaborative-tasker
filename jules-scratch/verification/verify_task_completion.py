from playwright.sync_api import sync_playwright, Page, expect

import time

def run_test(page: Page):
    """
    This test verifies the full lifecycle of a viewer task.
    """
    try:
        # Give the server a moment to start up
        time.sleep(5)

        # 1. Arrange: Go to the test environment page.
        page.goto("http://localhost:3000", timeout=20000)

        # Wait for the iframe to load and the CST_API to be available.
        widget_iframe = page.frame_locator("#widget-iframe")
        expect(widget_iframe.locator("#main-container")).to_be_visible(timeout=15000)

        # It can take a moment for the widget's JS to initialize fully
        page.wait_for_timeout(1000)

        # 2. Act: Add a pending task as a viewer
        viewer_name = "TestViewer123"
        task_description = "My test task from Playwright"

        page.locator("#command-username-input").fill(viewer_name)
        page.locator("#command-role-select").select_option("viewer")
        page.locator("#command-input").fill(f"!task {task_description}")
        page.locator("#emulate-command-button").click()

        # 3. Act: Approve the task as a moderator
        page.locator("#command-role-select").select_option("mod")
        page.locator("#command-input").fill(f"!approve {viewer_name}")
        page.locator("#emulate-command-button").click()

        # 4. Assert: Verify the task appears in the management list
        page.locator("#task-list-select").select_option("Viewers")

        task_management_list = page.locator("#task-management-list")
        task_item = task_management_list.locator("li", has_text=task_description)
        expect(task_item).to_be_visible(timeout=5000)
        expect(task_item.locator("strong")).to_have_text(viewer_name)

        # 5. Act: Click the 'Complete' button for that task
        complete_button = task_item.get_by_role("button", name="Complete")
        complete_button.click()

        # 6. Assert: Verify the task is marked as complete in the Floating Lists View
        floating_list_container = page.locator("#floating-lists-container")

        # Wait for the refresh interval in the test UI to fire
        page.wait_for_timeout(1500)

        completed_task_item = floating_list_container.locator("li", has_text=task_description)

        # The task text should be inside an `<s>` (strikethrough) element
        expect(completed_task_item.locator("s")).to_be_visible(timeout=5000)
        expect(completed_task_item.locator("s")).to_contain_text(task_description)

        # 7. Screenshot: Capture the final state of the floating view
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot saved successfully.")

    except Exception as e:
        print(f"An error occurred during Playwright test: {e}")
        # Take a screenshot even on failure to help debug
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
        print("Error screenshot saved.")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        run_test(page)
        browser.close()

if __name__ == "__main__":
    main()