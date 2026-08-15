import os
import time
from playwright.sync_api import sync_playwright

def run():
    screenshots_dir = "/home/jules/verification/screenshots"
    os.makedirs(screenshots_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        # Absolute file path to index.html
        html_path = os.path.abspath("index.html")
        page.goto(f"file://{html_path}")

        # Wait for initialization
        page.wait_for_selector("#stat-cgpa")
        time.sleep(1)

        # Verify CGPA rendering
        cgpa_text = page.inner_text("#stat-cgpa")
        print(f"Initial CGPA: {cgpa_text}")
        assert cgpa_text != "0.00", "CGPA should be calculated from sample data"

        # Test Adding a Course
        page.click("button:has-text('Add Course')")
        page.wait_for_selector("#modal-course", state="visible")

        page.fill("#input-course-code", "CS 301")
        page.fill("#input-course-name", "Database Systems")
        page.fill("#input-course-credits", "3.0")
        page.fill("#input-course-target", "95")

        page.click("#form-course button[type='submit']")
        page.wait_for_selector("h4:has-text('Database Systems')")
        print("Course CS 301 added successfully!")

        # Test What-If Predictor Calculator Modal
        page.click("button:has-text('Launch What-If Calculator')")
        page.wait_for_selector("#modal-whatif", state="visible")

        page.fill("#whatif-target-grade", "92")
        page.fill("#whatif-exam-weight", "25")
        time.sleep(0.5)

        req_score = page.inner_text("#whatif-required-score")
        print(f"What-If calculated required score: {req_score}")

        page.click("#modal-whatif button:has-text('Done')")

        # Toggle Theme
        page.click("#theme-toggle")
        time.sleep(0.5)

        # Capture screenshot for verification
        screenshot_path = os.path.join(screenshots_dir, "gradepulse_dashboard.png")
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    run()
