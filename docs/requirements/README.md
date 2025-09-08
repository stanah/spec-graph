# Requirements Documentation

This directory contains the structured requirements documentation for the req-mindmap project, organized according to ISO/IEC/IEEE 29148 standards.

## Directory Structure

- `00-overview/` - Project overview, goals, and glossary
- `01-stakeholder/` - Stakeholder requirements (StRS)
- `02-system/` - System requirements (SyRS)
- `03-functional/` - Functional requirements organized by module
- `04-non-functional/` - Non-functional requirements by quality attributes
- `05-architecture/` - Architecture requirements
- `06-validation/` - Validation and traceability documentation
- `templates/` - Templates for requirements documentation

## Usage

Each YAML file follows the schema definitions in `docs/schemas/requirements.v1.json`.

## ID Naming Convention

- Functional Requirements: `FR-{CATEGORY}-{NUMBER}` (e.g., FR-EDIT-001)
- Non-Functional Requirements: `NFR-{CATEGORY}-{NUMBER}` (e.g., NFR-PERF-001)