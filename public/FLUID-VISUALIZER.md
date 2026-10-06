# HPLC Fluid Visualizer browser port

The local application is `fluid-visualizer.html`. It is a dependency-free JavaScript/SVG port of the original Java HPLC Fluid Visualization application. Original authors: Paul Boswell and Jon Thompson. License: CC BY-NC-SA 3.0 US.

## Included

- Pumps, autosamplers, columns, detectors, waste vessels, tubing, and all ten original switching/selector valve configurations.
- Component dragging, tubing with editable bends and open ends, valve switching, pan/zoom, optional tube labels, and keyboard selection/movement.
- Editable pump solvent programs, flow/volume/pressure limits, tube diameter/length/volume, column packing and van Deemter terms, preheaters, and valve internal dimensions.
- Per-pump backpressure, volume-domain standard deviation, and upstream gradient delay; blocked-path and pressure-limit warnings.
- Six converted original example layouts, undo/redo, local browser persistence, JSON save/open, and SVG export.
- Responsive controls with the property panel below the diagram on narrow screens.

The application opens with the six-port injection valve example on first use. Subsequent visits and refreshes restore the current layout from browser storage. Use Save layout and Open to retain and restore layouts as files.

## Files and build

- `fluid/workspace.html`: page template.
- `public/assets/fluid/model.js`: calculations, topology traversal, and document validation; also loadable by Node.
- `public/assets/fluid/app.js`: editor and SVG rendering.
- `public/assets/fluid/help.js`: contextual help for properties, display controls, and calculated indicators.
- `public/assets/fluid/fluid.css`: responsive styling.
- `public/assets/fluid/examples.js`: converted original layouts.
- `fluid/java-reference.json`, `fluid/java-systems.json`: Java numerical reference fixtures.

Run `python build_site.py` to rebuild HTML and asset version hashes. No Java or server-side processing is needed to run the browser application.

## Model parity

Flow is in µL/min, pressure in bar, delay in minutes, and the internal dispersion calculation returns volume variance in mL². The displayed band broadening is its square root in µL. The model selects the highest-viscosity composition from 101 evenly spaced values spanning each pump's solvent program. Solvent A is water; B is methanol (0) or acetonitrile (1).

Tubing uses Hagen–Poiseuille pressure and the original longitudinal/Taylor dispersion equations. Columns use the original packed-bed pressure, van Deemter efficiency, and Wilke–Chang diffusion models. Valve properties include the rotor groove and two stator holes. Gradient delay includes pump volume and the flow path up to the first column, including its preheater, but not the column void volume. Detector internal contributions remain zero as in Java.

Tubing bends are drawing geometry only: physical length is independently editable. Colors show steady-state connectivity; they do not represent a time-dependent solvent or sample transport simulation. Blocked flow reports infinite pressure and suppresses misleading operating delay/broadening values. Cycle detection prevents invalid paths from hanging the browser.

Tubing follows its user-defined bend points, with a simple elbow route when no bends are specified. It does not automatically avoid components or labels. Flow arrows follow source traversal through the current valve connections; blocked or conflicting source paths have no arrows. Column fittings use side-view nut faces aligned with the column axis in both the diagram and parts palette.

Saved browser layouts use versioned JSON (`format: hplc-fluid-visualizer`, `version: 1`), not Java serialization. The six bundled `.lc` examples have been converted offline; arbitrary `.lc` files cannot be opened directly in the browser. The original downloads are preserved.

## Verification

Run `node tests/fluid-model.test.cjs`. It compares pressure, variance, and delay for 65 Java component reference cases, compares complete flow-path totals for every bundled example, checks all valve positions, and exercises upstream delay, source conflicts, closed selector ports, diameter scaling, and malformed imports.


Browser checks cover adding and connecting parts, valve double-click and position controls, live physical-property changes, undo/redo, JSON opening, and responsive sizing. Existing simulator model and plot-interaction tests also pass after the shared site build.
