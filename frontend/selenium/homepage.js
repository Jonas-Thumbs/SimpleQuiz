import assert from "node:assert/strict";
import { Builder, By, until } from "selenium-webdriver";

const driver = await new Builder().forBrowser("chrome").build();

try {
  await driver.get("http://localhost:5173");

  const heading = await driver.wait(
    until.elementLocated(By.css(".home-hero h2")),
    5000,
  );

  assert.equal(await heading.getText(), "Learn and Practice");
  console.log("Homepage acceptance test passed.");
} finally {
  await driver.quit();
}
