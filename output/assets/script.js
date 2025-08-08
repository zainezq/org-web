
// COPY BUTTON:
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("pre.src").forEach(function (block) {
    const button = document.createElement("button");
    button.innerText = "Copy";
    button.className = "copy-btn";

    // Append button inside <pre>
    block.appendChild(button);

    button.addEventListener("click", function () {
      const text = block.innerText.replace(button.innerText, ""); // exclude button text
      navigator.clipboard.writeText(text.trim()).then(() => {
        button.innerText = "Copied!";
        setTimeout(() => (button.innerText = "Copy"), 1500);
      });
    });
  });
});

