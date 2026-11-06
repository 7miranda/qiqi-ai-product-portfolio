# W5 logistics integration

Source visual: user-provided `物流仓页面优化设计.zip`, November 2026 v4 demo. Preserves its scene, fixed camera, vehicle choreography, voyage card, warehouse shutter, moving conveyors, forklifts, embedded brand fonts and bottom operation dock.

`host.js` mounts this scene at W5 using the existing game transition host. `session.js` owns the authoritative connection to the game; `frame.js` displays serializable snapshots and sends validated commands. `departure.js` retains the approved demo transition. Removing the frame disposes its render context and listeners with the scene.

The original engine remains responsible for route pricing, product volume and market multipliers, arrival stock, fulfillment orders, affordability, settlement, returned stock, receivables and next-round progression. Selecting a route saves configuration without charging cash. Dispatch calls the existing choice/commit handlers, waits for the real report, then animates its actual order count. Prior first-mile payments are handled by the engine. No fixed 700/640 batch or Los Angeles destination is used.

The arrival checkpoint is presentation-only local storage, scoped to run/round/attempt/market/product/quantity/supplier. Leaving and reopening W5 resumes the warehouse. Repeating a round invalidates the checkpoint. Game saves and ledger schemas are unchanged. The receipt continues to W6 using the scene host.

Verification: `node --test tests/crossbound-logistics.test.mjs`; existing suite (177 checks, with packaging check rerun successfully after stopping the Windows preview server that held the dist directory open); `npm run build`. Browser QA covered all three routes, selecting express fulfillment, returning/reentering the warehouse, actual ledger settlement, receipt and W6 continuation. Local static preview does not provide the optional records API.

Assets and font licenses are adjacent to their files. The model, textures and runtime bundle are supplied by the approved demo rather than fetched from external services.
