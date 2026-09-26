# Projects Alpha UI15 evidence

Date: 2026-09-17

## Runtime observations

- Project instruction, skill, expert, and connector configuration use the same large modal shell.
- Modal content scrolls independently and the action footer remains fixed inside the modal.
- The expert flow uses an outer project-configuration dialog and nested catalog dialog. Inner confirmation updates only the outer draft; outer cancellation leaves the persisted project unchanged.
- Entering `取消验证-不应保存` in Project Instruction, cancelling, and reopening showed the original empty instruction and configuration revision 1.
- Enabled primary actions use the WorkDSH blue theme, while disabled actions use a dark gray disabled treatment rather than a white block.

## Source check

The Projects client uses React-controlled modals for all configuration and asset flows. It does not call browser-native `alert`, `confirm`, or `prompt`; errors remain inside the active dialog and cancellation drops local draft state.

This evidence covers UI15.
