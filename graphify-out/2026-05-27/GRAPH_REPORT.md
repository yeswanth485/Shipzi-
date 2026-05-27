# Graph Report - Packiq-main  (2026-05-27)

## Corpus Check
- 219 files · ~88,251 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 762 nodes · 1001 edges · 140 communities (108 shown, 32 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 105 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b25265e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 124|Community 124]]
- [[_COMMUNITY_Community 132|Community 132]]
- [[_COMMUNITY_Community 133|Community 133]]
- [[_COMMUNITY_Community 134|Community 134]]
- [[_COMMUNITY_Community 135|Community 135]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 29 edges
2. `BoxSpec` - 25 edges
3. `OptimizationInput` - 25 edges
4. `OptimizationResponse` - 25 edges
5. `AlternativeBox` - 17 edges
6. `ScoreBreakdown` - 16 edges
7. `compilerOptions` - 16 edges
8. `Badge()` - 16 edges
9. `float` - 14 edges
10. `DashboardClient` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Fix Summary: Orders-Products Relationship Error` --references--> `Backend Database Schema`  [EXTRACTED]
  MIGRATION_FIX.md → database/database.sql
- `Fix Summary: Orders-Products Relationship Error` --references--> `Frontend Supabase Schema`  [EXTRACTED]
  MIGRATION_FIX.md → frontend/supabase/schema.sql
- `Fix Summary: Orders-Products Relationship Error` --references--> `Migration: Fix Orders Shipments Schema`  [EXTRACTED]
  MIGRATION_FIX.md → supabase/migrations/fix_orders_shipments_schema.sql
- `run_xgboost_optimization()` --calls--> `check_all_orientations()`  [INFERRED]
  backend/engine/xgboost_engine.py → backend/engine/advanced_scorer.py
- `float` --uses--> `OptimizationInput`  [INFERRED]
  backend/engine/advanced_scorer.py → backend/models/schemas.py

## Communities (140 total, 32 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (49): Any, bool, BoxSpec, float, int, OptimizationInput, OptimizationResponse, str (+41 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (43): ThreeDPage(), AnalyticsPage(), useDashboard(), CompanyHeader(), CarrierDistributionDonut, DashboardClient(), SuccessRateAreaChart, TotalSavedBarChart (+35 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (45): dependencies, asynckit, bidi-js, canvas-confetti, chart.js, clsx, combined-stream, es-set-tostringtag (+37 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (8): useAuth(), Features, HowItWorks(), STEPS, PLANS, STATS, PARTNERS, Suppliers()

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (32): GET(), GET(), PlanKey, PLANS, stripe, BoxSpec, findBestBox(), MLRunResult (+24 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (13): CountUpNumber(), CountUpNumberProps, DataFlowLine(), NumberTicker(), PulsingBorderProps, ScanLineEffect(), StaggerContainerProps, StaggerItem() (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (17): compat, __dirname, eslintConfig, __filename, devDependencies, autoprefixer, eslint, eslint-config-next (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (14): code_summary, features, known_limitations, routes, tech_stack, type, version, core_goals (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.21
Nodes (9): config, DEFAULT_BOXES, getSupabase(), parseCSV(), POST(), checkRateLimit(), getRateLimitStatus(), RateLimitEntry (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (21): After (Fixed):, API Endpoints Verified ✅, Before (Broken):, code:block3 (Optimization Tab), code:typescript (const product = order.product_snapshot || {};), Data Transformation on Frontend ✅, Files Modified, Fix Summary: Orders-Products Relationship Error (+13 more)

### Community 11 - "Community 11"
Cohesion: 0.27
Nodes (4): SKUComparisonChart, SpaceUtilizationScatter, SKUComparisonChart(), SpaceUtilizationScatter()

### Community 12 - "Community 12"
Cohesion: 0.31
Nodes (11): calcBoxPrice(), calcCO2Saved(), calcDimWeight(), calcSavings(), calcSpaceUtilization(), findOptimalBox(), generateFragilityScore(), generateOptimizationScore() (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.40
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (6): Box2DFallback(), Box3DErrorBoundary, Box3DViewer(), Box3DViewerContent(), Box3DViewerProps, Box3DViewer

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (6): ALIASES, findValue(), normalizeHeader(), ParsedProduct, ParseError, ParseResult

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (10): inter, metadata, outfit, spaceGrotesk, spaceMono, syne, viewport, AuthContext (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (10): DashboardContext, DashboardContextType, DashboardProvider(), DashboardStats, DashboardLayoutClient(), DashboardLayoutClientProps, navItems, Sidebar() (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (4): INDUSTRIES, inter, LINE_SPEEDS, syne

### Community 21 - "Community 21"
Cohesion: 0.29
Nodes (6): created_at, source, status, step_index, tool_calls, type

### Community 22 - "Community 22"
Cohesion: 0.50
Nodes (3): Fix Google OAuth Redirect & Onboarding Flow, Status, Steps

### Community 24 - "Community 24"
Cohesion: 0.60
Nodes (4): checkVerificationCode(), client, sendVerificationCode(), POST()

### Community 26 - "Community 26"
Cohesion: 0.40
Nodes (3): Box3DViewer, CARRIER_BOXES, TABS

### Community 29 - "Community 29"
Cohesion: 0.40
Nodes (3): fs, path, readline

### Community 32 - "Community 32"
Cohesion: 0.70
Nodes (3): LimitGuard(), SubscriptionState, useSubscription()

### Community 35 - "Community 35"
Cohesion: 0.50
Nodes (3): maxDuration, functions, app/api/optimize/route.ts

### Community 48 - "Community 48"
Cohesion: 0.83
Nodes (3): INDUSTRIES, Step2CompanyDetails(), Step2Props

## Knowledge Gaps
- **218 isolated node(s):** `maxDuration`, `Request`, `__filename`, `__dirname`, `compat` (+213 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 1` to `Community 32`, `Community 4`, `Community 16`, `Community 17`, `Community 20`, `Community 26`, `Community 27`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Database` connect `Community 5` to `Community 1`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `BoxSpec` (e.g. with `float` and `bool`) actually correct?**
  _`BoxSpec` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `OptimizationInput` (e.g. with `float` and `bool`) actually correct?**
  _`OptimizationInput` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `OptimizationResponse` (e.g. with `float` and `bool`) actually correct?**
  _`OptimizationResponse` has 23 INFERRED edges - model-reasoned connections that need verification._
- **What connects `maxDuration`, `Request`, `Uses an XGBoost-like scoring logic.         If a model was loaded, it would use` to the rest of the system?**
  _219 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12337662337662338 - nodes in this community are weakly interconnected._