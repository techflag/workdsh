# Projects Alpha UI12 evidence

Date: 2026-09-17

## Runtime observations

- Project details keep the four tab sections mounted under one fixed detail frame.
- The configuration sidebar and composer remained visible while switching from Dynamic to Plan and then Asset.
- A composer draft containing `引用稳定性验证`, one selected WorkItem, and one selected Library asset remained unchanged after those tab switches.
- The selected items stayed visible as removable typed chips, and a failed stale-reference submission preserved the draft and chips.
- Draft state is keyed by Project ID, preventing one project’s unfinished input from replacing another project’s draft when returning through the Project Center.

This evidence covers UI12 for text, asset attachment, and selected-reference persistence across detail tabs.
