-- Travel Mode Quick Launch
tell application "Claude"
    activate
    delay 1
    tell application "System Events"
        keystroke "travel mode"
        keystroke return
    end tell
end tell