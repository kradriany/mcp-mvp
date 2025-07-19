const express = require('express');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 4000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Read the OpenAPI specification
const openApiDocument = JSON.parse(fs.readFileSync(path.join(__dirname, 'openapi.json'), 'utf8'));

// Mock data generators
const mockHandlers = {
  // Authentication endpoint
  '/developer/v1/o/token/': {
    post: (req, res) => {
      const { client_id, client_secret, grant_type } = req.body;
      
      if (grant_type === 'client_credentials' && client_id && client_secret) {
        return res.json({
          access_token: 'mock_access_token_' + Math.random().toString(36).substring(7),
          token_type: 'Bearer',
          expires_in: 86400,
          scope: 'developer-api'
        });
      }
      
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid credentials given.'
      });
    }
  },

  // Revoke token endpoint
  '/developer/v1/o/revoke_token/': {
    post: (req, res) => {
      return res.status(200).send();
    }
  },

  // Printers list endpoint
  '/developer/v1/printers/': {
    get: (req, res) => {
      return res.json([
        {
          serial: 'MOCK-PRINTER-001',
          alias: 'Office Printer 1',
          machine_type_id: 'FORM3',
          printer_status: {
            status: 'IDLE',
            last_pinged_at: new Date().toISOString(),
            hopper_level: 85,
            material_credit: 150.5,
            hopper_material: 'Clear Resin',
            last_modified: new Date().toISOString(),
            current_temperature: 23.5,
            current_print_run: null,
            form_cell: null,
            last_printer_cooldown_started: null,
            outer_boundary_offset_corrections: null,
            build_platform_contents: 'BUILD_PLATFORM_CONTENTS_CONFIRMED_CLEAR',
            tank_mixer_state: 'TANK_MIXER_STATE_PRESENT',
            ready_to_print: 'READY_TO_PRINT_READY',
            printer_capabilities: ['remote_print', 'camera'],
            printernet_capabilities: ['cloud_print'],
            camera_status: 'ENABLED'
          },
          cartridge_status: [{
            cartridge: {
              serial: 'CART-001',
              material: 'Clear',
              consumable_type: 'resin',
              initial_volume_ml: 1000,
              volume_dispensed_ml: 250,
              display_name: 'Clear Resin Cartridge',
              is_empty: false,
              inside_printer: 'MOCK-PRINTER-001',
              connected_group: null,
              created_at: '2024-01-01T00:00:00Z',
              last_print_date: new Date().toISOString(),
              machine_type_id: 'FORM3'
            },
            last_modified: new Date().toISOString(),
            cartridge_slot: 'FRONT'
          }],
          tank_status: {
            tank: {
              serial: 'TANK-001',
              material: 'Clear',
              print_time_ms: 3600000,
              layers_printed: 1500,
              first_fill_date: '2024-01-01T00:00:00Z',
              heatmap: 'mock_heatmap_data',
              heatmap_gif: 'https://example.com/heatmap.gif',
              display_name: 'Clear Tank',
              layer_count: 2000,
              inside_printer: 'MOCK-PRINTER-001',
              tank_type: 'LT',
              connected_group: null,
              created_at: '2024-01-01T00:00:00Z',
              last_print_date: new Date().toISOString()
            },
            last_modified: new Date().toISOString()
          },
          group: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Engineering Lab'
          },
          previous_print_run: {},
          firmware_version: '1.8.3',
          location: 'Building A, Room 101'
        },
        {
          serial: 'MOCK-PRINTER-002',
          alias: 'Production Printer',
          machine_type_id: 'FORM3L',
          printer_status: {
            status: 'PRINTING',
            last_pinged_at: new Date().toISOString(),
            hopper_level: 45,
            material_credit: 89.2,
            hopper_material: 'Tough 2000',
            last_modified: new Date().toISOString(),
            current_temperature: 24.1,
            current_print_run: {
              guid: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Engineering Part v3',
              printer: 'MOCK-PRINTER-002',
              status: 'PRINTING',
              using_open_mode: false,
              z_height_offset_mm: 0.1,
              print_started_at: new Date(Date.now() - 3600000).toISOString(),
              print_finished_at: null,
              layer_count: 500,
              volume_ml: 125.5,
              material: 'Tough 2000',
              layer_thickness_mm: 0.1,
              currently_printing_layer: 250,
              estimated_duration_ms: 7200000,
              elapsed_duration_ms: 3600000,
              estimated_time_remaining_ms: 3600000,
              created_at: new Date(Date.now() - 3700000).toISOString(),
              print_run_success: {
                print_run: '550e8400-e29b-41d4-a716-446655440000',
                print_run_success: 'UNKNOWN',
                created_at: null
              },
              firmware_version: '1.8.3',
              cartridge: 'CART-002',
              front_cartridge: 'CART-002',
              back_cartridge: null,
              tank: 'TANK-002',
              cylinder: null,
              note: {
                print_run: '550e8400-e29b-41d4-a716-446655440000',
                note: 'Production run for client X',
                author: {
                  id: 1,
                  username: 'john.doe',
                  first_name: 'John',
                  last_name: 'Doe',
                  email: 'john.doe@example.com'
                },
                updated_at: new Date().toISOString()
              },
              print_thumbnail: {
                thumbnail: 'https://example.com/thumbnail.png'
              },
              post_print_photo_url: null,
              user: {
                id: 1,
                username: 'john.doe',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com'
              },
              user_custom_label: 'Client X Order',
              group: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'Engineering Lab'
              },
              adaptive_thickness: false,
              message: null,
              print_job: 'JOB-12345',
              material_name: 'Tough 2000 Resin',
              print_settings_name: 'Default',
              print_settings_code: 'DEFAULT_100',
              form_auto_serial: null,
              form_auto_fw_version: null,
              harvest_status: null
            },
            form_cell: null,
            last_printer_cooldown_started: null,
            outer_boundary_offset_corrections: null,
            build_platform_contents: 'BUILD_PLATFORM_CONTENTS_POST_PRINT',
            tank_mixer_state: 'TANK_MIXER_STATE_PRESENT',
            ready_to_print: 'READY_TO_PRINT_NOT_READY',
            printer_capabilities: ['remote_print', 'camera', 'material_sensing'],
            printernet_capabilities: ['cloud_print', 'fleet_control'],
            camera_status: 'ENABLED'
          },
          cartridge_status: [{
            cartridge: {
              serial: 'CART-002',
              material: 'Tough 2000',
              consumable_type: 'resin',
              initial_volume_ml: 1000,
              volume_dispensed_ml: 550,
              display_name: 'Tough 2000 Cartridge',
              is_empty: false,
              inside_printer: 'MOCK-PRINTER-002',
              connected_group: null,
              created_at: '2024-02-01T00:00:00Z',
              last_print_date: new Date().toISOString(),
              machine_type_id: 'FORM3L'
            },
            last_modified: new Date().toISOString(),
            cartridge_slot: 'FRONT'
          }],
          tank_status: {
            tank: {
              serial: 'TANK-002',
              material: 'Tough 2000',
              print_time_ms: 18000000,
              layers_printed: 8500,
              first_fill_date: '2024-02-01T00:00:00Z',
              heatmap: 'mock_heatmap_data',
              heatmap_gif: 'https://example.com/heatmap2.gif',
              display_name: 'Tough 2000 Tank',
              layer_count: 10000,
              inside_printer: 'MOCK-PRINTER-002',
              tank_type: 'LT',
              connected_group: null,
              created_at: '2024-02-01T00:00:00Z',
              last_print_date: new Date().toISOString()
            },
            last_modified: new Date().toISOString()
          },
          group: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Engineering Lab'
          },
          previous_print_run: {},
          firmware_version: '1.8.3',
          location: 'Building A, Room 102'
        }
      ]);
    }
  },

  // Prints list endpoint
  '/developer/v1/prints/': {
    get: (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const per_page = parseInt(req.query.per_page) || 20;
      
      const prints = [
        {
          guid: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Prototype Housing v2',
          printer: 'MOCK-PRINTER-001',
          status: 'FINISHED',
          using_open_mode: false,
          z_height_offset_mm: 0.0,
          print_started_at: new Date(Date.now() - 86400000).toISOString(),
          print_finished_at: new Date(Date.now() - 82800000).toISOString(),
          layer_count: 350,
          volume_ml: 45.2,
          material: 'Clear',
          layer_thickness_mm: 0.1,
          currently_printing_layer: 350,
          estimated_duration_ms: 3600000,
          elapsed_duration_ms: 3600000,
          estimated_time_remaining_ms: 0,
          created_at: new Date(Date.now() - 90000000).toISOString(),
          print_run_success: {
            print_run: '550e8400-e29b-41d4-a716-446655440001',
            print_run_success: 'SUCCESS',
            created_at: new Date(Date.now() - 82800000).toISOString()
          },
          firmware_version: '1.8.3',
          cartridge: 'CART-001',
          front_cartridge: 'CART-001',
          back_cartridge: null,
          tank: 'TANK-001',
          cylinder: null,
          note: {
            print_run: '550e8400-e29b-41d4-a716-446655440001',
            note: 'Test print for new design',
            author: {
              id: 1,
              username: 'john.doe',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john.doe@example.com'
            },
            updated_at: new Date(Date.now() - 82800000).toISOString()
          },
          print_thumbnail: {
            thumbnail: 'https://example.com/thumb1.png'
          },
          post_print_photo_url: 'https://example.com/photo1.jpg',
          user: {
            id: 1,
            username: 'john.doe',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com'
          },
          user_custom_label: 'Prototype Test',
          group: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Engineering Lab'
          },
          adaptive_thickness: false,
          message: null,
          print_job: 'JOB-12344',
          material_name: 'Clear Resin',
          print_settings_name: 'Default',
          print_settings_code: 'DEFAULT_100',
          cloud_queue_item: null,
          form_auto_serial: null,
          form_auto_fw_version: null,
          harvest_status: 'FORM_CELL_HARVEST_FINISHED',
          parts: [{
            id: 1,
            guid: '660e8400-e29b-41d4-a716-446655440001',
            display_name: 'Housing',
            end_layer: 350,
            name: 'housing_v2.stl',
            raw_mesh_hash: 'abc123',
            start_layer: 0,
            volume_ml: 45.2,
            prepared_scene: 'scene_001'
          }],
          print_intent: null
        },
        {
          guid: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Medical Device Component',
          printer: 'MOCK-PRINTER-002',
          status: 'ABORTED',
          using_open_mode: false,
          z_height_offset_mm: 0.1,
          print_started_at: new Date(Date.now() - 172800000).toISOString(),
          print_finished_at: new Date(Date.now() - 169200000).toISOString(),
          layer_count: 800,
          volume_ml: 180.5,
          material: 'BioMed Clear',
          layer_thickness_mm: 0.05,
          currently_printing_layer: 423,
          estimated_duration_ms: 14400000,
          elapsed_duration_ms: 3600000,
          estimated_time_remaining_ms: 0,
          created_at: new Date(Date.now() - 173000000).toISOString(),
          print_run_success: {
            print_run: '550e8400-e29b-41d4-a716-446655440002',
            print_run_success: 'FAILURE',
            created_at: new Date(Date.now() - 169200000).toISOString()
          },
          firmware_version: '1.8.3',
          cartridge: 'CART-003',
          front_cartridge: 'CART-003',
          back_cartridge: null,
          tank: 'TANK-003',
          cylinder: null,
          note: {
            print_run: '550e8400-e29b-41d4-a716-446655440002',
            note: 'Print failed due to power outage',
            author: {
              id: 2,
              username: 'jane.smith',
              first_name: 'Jane',
              last_name: 'Smith',
              email: 'jane.smith@example.com'
            },
            updated_at: new Date(Date.now() - 169200000).toISOString()
          },
          print_thumbnail: {
            thumbnail: 'https://example.com/thumb2.png'
          },
          post_print_photo_url: null,
          user: {
            id: 2,
            username: 'jane.smith',
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane.smith@example.com'
          },
          user_custom_label: 'Medical Prototype',
          group: {
            id: '223e4567-e89b-12d3-a456-426614174001',
            name: 'Medical Lab'
          },
          adaptive_thickness: true,
          message: 'Print aborted due to power failure',
          print_job: 'JOB-12346',
          material_name: 'BioMed Clear',
          print_settings_name: 'High Resolution',
          print_settings_code: 'HIGH_RES_50',
          cloud_queue_item: null,
          form_auto_serial: null,
          form_auto_fw_version: null,
          harvest_status: null,
          parts: [{
            id: 2,
            guid: '770e8400-e29b-41d4-a716-446655440002',
            display_name: 'Medical Component',
            end_layer: 800,
            name: 'medical_component.stl',
            raw_mesh_hash: 'def456',
            start_layer: 0,
            volume_ml: 180.5,
            prepared_scene: 'scene_002'
          }],
          print_intent: null
        }
      ];
      
      return res.json({
        count: prints.length,
        next: page < 2 ? `http://localhost:${port}/developer/v1/prints/?page=${page + 1}` : null,
        previous: page > 1 ? `http://localhost:${port}/developer/v1/prints/?page=${page - 1}` : null,
        results: prints.slice((page - 1) * per_page, page * per_page)
      });
    }
  },

  // Groups list endpoint
  '/developer/v1/groups/': {
    get: (req, res) => {
      return res.json([
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Engineering Lab',
          remote_print_enabled_override: true,
          created_at: '2024-01-01T00:00:00Z',
          memberships: [
            {
              is_admin: true,
              user: 'john.doe',
              email: 'john.doe@example.com',
              first_name: 'John',
              last_name: 'Doe'
            },
            {
              is_admin: false,
              user: 'jane.smith',
              email: 'jane.smith@example.com',
              first_name: 'Jane',
              last_name: 'Smith'
            }
          ],
          printers: ['MOCK-PRINTER-001', 'MOCK-PRINTER-002'],
          invitations: [],
          has_fleet_control: true,
          has_fleet_control_updated_by: 1,
          settings: {
            group: '123e4567-e89b-12d3-a456-426614174000',
            update_mode: 'auto'
          }
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          name: 'Medical Lab',
          remote_print_enabled_override: true,
          created_at: '2024-02-01T00:00:00Z',
          memberships: [
            {
              is_admin: true,
              user: 'jane.smith',
              email: 'jane.smith@example.com',
              first_name: 'Jane',
              last_name: 'Smith'
            }
          ],
          printers: [],
          invitations: [
            {
              email: 'new.user@example.com',
              is_admin: false
            }
          ],
          has_fleet_control: false,
          has_fleet_control_updated_by: null,
          settings: {
            group: '223e4567-e89b-12d3-a456-426614174001',
            update_mode: 'manual'
          }
        }
      ]);
    },
    post: (req, res) => {
      const { name } = req.body;
      return res.status(201).json({
        id: '323e4567-e89b-12d3-a456-426614174002',
        name: name || 'New Group',
        created_at: new Date().toISOString(),
        has_fleet_control: false,
        has_fleet_control_updated_by: null
      });
    }
  },

  // Tanks list endpoint
  '/developer/v1/tanks/': {
    get: (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const per_page = parseInt(req.query.per_page) || 20;
      
      const tanks = [
        {
          serial: 'TANK-001',
          material: 'Clear',
          layers_printed: 1500,
          print_time_ms: 3600000,
          heatmap: 'mock_heatmap_data',
          heatmap_gif: 'https://example.com/heatmap.gif',
          mechanical_version: 'v2.1',
          manufacture_date: '2023-12-01T00:00:00Z',
          manufacturer: 'Formlabs',
          display_name: 'Clear Tank',
          lot_number: 'LOT-2023-12-001',
          layer_count: 2000,
          last_modified: new Date().toISOString(),
          inside_printer: 'MOCK-PRINTER-001',
          write_count: 15,
          tank_type: 'LT',
          connected_group: '123e4567-e89b-12d3-a456-426614174000',
          first_fill_date: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          last_print_date: new Date().toISOString()
        },
        {
          serial: 'TANK-002',
          material: 'Tough 2000',
          layers_printed: 8500,
          print_time_ms: 18000000,
          heatmap: 'mock_heatmap_data',
          heatmap_gif: 'https://example.com/heatmap2.gif',
          mechanical_version: 'v2.1',
          manufacture_date: '2024-01-15T00:00:00Z',
          manufacturer: 'Formlabs',
          display_name: 'Tough 2000 Tank',
          lot_number: 'LOT-2024-01-002',
          layer_count: 10000,
          last_modified: new Date().toISOString(),
          inside_printer: 'MOCK-PRINTER-002',
          write_count: 85,
          tank_type: 'LT',
          connected_group: '123e4567-e89b-12d3-a456-426614174000',
          first_fill_date: '2024-02-01T00:00:00Z',
          created_at: '2024-02-01T00:00:00Z',
          last_print_date: new Date().toISOString()
        }
      ];
      
      return res.json({
        count: tanks.length,
        next: page < 1 ? `http://localhost:${port}/developer/v1/tanks/?page=${page + 1}` : null,
        previous: page > 1 ? `http://localhost:${port}/developer/v1/tanks/?page=${page - 1}` : null,
        results: tanks.slice((page - 1) * per_page, page * per_page)
      });
    }
  },

  // Cartridges list endpoint
  '/developer/v1/cartridges/': {
    get: (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const per_page = parseInt(req.query.per_page) || 20;
      
      const cartridges = [
        {
          serial: 'CART-001',
          consumable_type: 'resin',
          machine_type_id: 'FORM3',
          material: 'Clear',
          initial_volume_ml: 1000,
          volume_dispensed_ml: 250,
          dispense_count: 5,
          write_count: 10,
          mechanical_version: 'v3.0',
          manufacture_date: '2023-11-01T00:00:00Z',
          manufacturer: 'Formlabs',
          display_name: 'Clear Resin Cartridge',
          lot_number: 'LOT-2023-11-001',
          last_modified: new Date().toISOString(),
          is_empty: false,
          inside_printer: 'MOCK-PRINTER-001',
          connected_group: '123e4567-e89b-12d3-a456-426614174000',
          created_at: '2024-01-01T00:00:00Z',
          last_print_date: new Date().toISOString()
        },
        {
          serial: 'CART-002',
          consumable_type: 'resin',
          machine_type_id: 'FORM3L',
          material: 'Tough 2000',
          initial_volume_ml: 1000,
          volume_dispensed_ml: 550,
          dispense_count: 12,
          write_count: 25,
          mechanical_version: 'v3.0',
          manufacture_date: '2024-01-01T00:00:00Z',
          manufacturer: 'Formlabs',
          display_name: 'Tough 2000 Cartridge',
          lot_number: 'LOT-2024-01-002',
          last_modified: new Date().toISOString(),
          is_empty: false,
          inside_printer: 'MOCK-PRINTER-002',
          connected_group: '123e4567-e89b-12d3-a456-426614174000',
          created_at: '2024-02-01T00:00:00Z',
          last_print_date: new Date().toISOString()
        }
      ];
      
      return res.json({
        count: cartridges.length,
        next: page < 1 ? `http://localhost:${port}/developer/v1/cartridges/?page=${page + 1}` : null,
        previous: page > 1 ? `http://localhost:${port}/developer/v1/cartridges/?page=${page - 1}` : null,
        results: cartridges.slice((page - 1) * per_page, page * per_page)
      });
    }
  },

  // Events list endpoint
  '/developer/v1/events/': {
    get: (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const per_page = parseInt(req.query.per_page) || 20;
      
      const events = [
        {
          id: 1,
          printer: 'MOCK-PRINTER-001',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          print_run: {
            guid: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Prototype Housing v2',
            printer: 'MOCK-PRINTER-001',
            status: 'FINISHED',
            using_open_mode: false,
            z_height_offset_mm: 0.0,
            print_started_at: new Date(Date.now() - 86400000).toISOString(),
            print_finished_at: new Date(Date.now() - 82800000).toISOString(),
            layer_count: 350,
            volume_ml: 45.2,
            material: 'Clear',
            layer_thickness_mm: 0.1,
            currently_printing_layer: 350,
            estimated_duration_ms: 3600000,
            elapsed_duration_ms: 3600000,
            estimated_time_remaining_ms: 0,
            created_at: new Date(Date.now() - 90000000).toISOString(),
            print_run_success: {
              print_run: '550e8400-e29b-41d4-a716-446655440001',
              print_run_success: 'SUCCESS',
              created_at: new Date(Date.now() - 82800000).toISOString()
            },
            firmware_version: '1.8.3',
            cartridge: 'CART-001',
            front_cartridge: 'CART-001',
            back_cartridge: null,
            tank: 'TANK-001',
            cylinder: null,
            note: {
              print_run: '550e8400-e29b-41d4-a716-446655440001',
              note: 'Test print for new design',
              author: {
                id: 1,
                username: 'john.doe',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com'
              },
              updated_at: new Date(Date.now() - 82800000).toISOString()
            },
            print_thumbnail: {
              thumbnail: 'https://example.com/thumb1.png'
            },
            post_print_photo_url: 'https://example.com/photo1.jpg',
            user: {
              id: 1,
              username: 'john.doe',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john.doe@example.com'
            },
            user_custom_label: 'Prototype Test',
            group: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'Engineering Lab'
            },
            adaptive_thickness: false,
            message: null,
            print_job: 'JOB-12344',
            material_name: 'Clear Resin',
            print_settings_name: 'Default',
            print_settings_code: 'DEFAULT_100',
            form_auto_serial: null,
            form_auto_fw_version: null,
            harvest_status: 'FORM_CELL_HARVEST_FINISHED'
          },
          tank: 'TANK-001',
          cartridge: 'CART-001',
          type: 'PRINT_FINISHED',
          type_label: 'Print Finished',
          action: 'completed',
          message: 'Print "Prototype Housing v2" completed successfully',
          was_read: false,
          group: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Engineering Lab'
          }
        },
        {
          id: 2,
          printer: 'MOCK-PRINTER-002',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          print_run: null,
          tank: null,
          cartridge: 'CART-002',
          type: 'CARTRIDGE_LOW',
          type_label: 'Cartridge Low',
          action: 'warning',
          message: 'Cartridge CART-002 is running low (45% remaining)',
          was_read: true,
          group: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Engineering Lab'
          }
        }
      ];
      
      return res.json({
        count: events.length,
        next: page < 1 ? `http://localhost:${port}/developer/v1/events/?page=${page + 1}` : null,
        previous: page > 1 ? `http://localhost:${port}/developer/v1/events/?page=${page - 1}` : null,
        results: events.slice((page - 1) * per_page, page * per_page)
      });
    }
  }
};

// Setup routes for mock endpoints
Object.entries(mockHandlers).forEach(([path, methods]) => {
  Object.entries(methods).forEach(([method, handler]) => {
    app[method](path, handler);
  });
});

// Handle printer detail endpoint with parameter
app.get('/developer/v1/printers/:printer_serial/', (req, res) => {
  const { printer_serial } = req.params;
  
  if (printer_serial === 'MOCK-PRINTER-001') {
    return res.json({
      serial: 'MOCK-PRINTER-001',
      alias: 'Office Printer 1',
      machine_type_id: 'FORM3',
      printer_status: {
        status: 'IDLE',
        last_pinged_at: new Date().toISOString(),
        hopper_level: 85,
        material_credit: 150.5,
        hopper_material: 'Clear Resin',
        last_modified: new Date().toISOString(),
        current_temperature: 23.5,
        current_print_run: null,
        form_cell: null,
        last_printer_cooldown_started: null,
        outer_boundary_offset_corrections: null,
        build_platform_contents: 'BUILD_PLATFORM_CONTENTS_CONFIRMED_CLEAR',
        tank_mixer_state: 'TANK_MIXER_STATE_PRESENT',
        ready_to_print: 'READY_TO_PRINT_READY',
        printer_capabilities: ['remote_print', 'camera'],
        printernet_capabilities: ['cloud_print'],
        camera_status: 'ENABLED'
      },
      cartridge_status: [{
        cartridge: {
          serial: 'CART-001',
          material: 'Clear',
          consumable_type: 'resin',
          initial_volume_ml: 1000,
          volume_dispensed_ml: 250,
          display_name: 'Clear Resin Cartridge',
          is_empty: false,
          inside_printer: 'MOCK-PRINTER-001',
          connected_group: null,
          created_at: '2024-01-01T00:00:00Z',
          last_print_date: new Date().toISOString(),
          machine_type_id: 'FORM3'
        },
        last_modified: new Date().toISOString(),
        cartridge_slot: 'FRONT'
      }],
      tank_status: {
        tank: {
          serial: 'TANK-001',
          material: 'Clear',
          print_time_ms: 3600000,
          layers_printed: 1500,
          first_fill_date: '2024-01-01T00:00:00Z',
          heatmap: 'mock_heatmap_data',
          heatmap_gif: 'https://example.com/heatmap.gif',
          display_name: 'Clear Tank',
          layer_count: 2000,
          inside_printer: 'MOCK-PRINTER-001',
          tank_type: 'LT',
          connected_group: null,
          created_at: '2024-01-01T00:00:00Z',
          last_print_date: new Date().toISOString()
        },
        last_modified: new Date().toISOString()
      },
      group: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Engineering Lab'
      },
      previous_print_run: {},
      firmware_version: '1.8.3',
      location: 'Building A, Room 101'
    });
  }
  
  return res.status(404).json({ error: 'Printer not found' });
});

// Handle printer prints endpoint
app.get('/developer/v1/printers/:printer_serial/prints/', (req, res) => {
  const { printer_serial } = req.params;
  const page = parseInt(req.query.page) || 1;
  const per_page = parseInt(req.query.per_page) || 20;
  
  const prints = [
    {
      guid: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Prototype Housing v2',
      printer: printer_serial,
      status: 'FINISHED',
      using_open_mode: false,
      z_height_offset_mm: 0.0,
      print_started_at: new Date(Date.now() - 86400000).toISOString(),
      print_finished_at: new Date(Date.now() - 82800000).toISOString(),
      layer_count: 350,
      volume_ml: 45.2,
      material: 'Clear',
      layer_thickness_mm: 0.1,
      currently_printing_layer: 350,
      estimated_duration_ms: 3600000,
      elapsed_duration_ms: 3600000,
      estimated_time_remaining_ms: 0,
      created_at: new Date(Date.now() - 90000000).toISOString(),
      print_run_success: {
        print_run: '550e8400-e29b-41d4-a716-446655440001',
        print_run_success: 'SUCCESS',
        created_at: new Date(Date.now() - 82800000).toISOString()
      },
      firmware_version: '1.8.3',
      cartridge: 'CART-001',
      front_cartridge: 'CART-001',
      back_cartridge: null,
      tank: 'TANK-001',
      cylinder: null,
      note: {
        print_run: '550e8400-e29b-41d4-a716-446655440001',
        note: 'Test print for new design',
        author: {
          id: 1,
          username: 'john.doe',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com'
        },
        updated_at: new Date(Date.now() - 82800000).toISOString()
      },
      print_thumbnail: {
        thumbnail: 'https://example.com/thumb1.png'
      },
      post_print_photo_url: 'https://example.com/photo1.jpg',
      user: {
        id: 1,
        username: 'john.doe',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com'
      },
      user_custom_label: 'Prototype Test',
      group: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Engineering Lab'
      },
      adaptive_thickness: false,
      message: null,
      print_job: 'JOB-12344',
      material_name: 'Clear Resin',
      print_settings_name: 'Default',
      print_settings_code: 'DEFAULT_100',
      cloud_queue_item: null,
      form_auto_serial: null,
      form_auto_fw_version: null,
      harvest_status: 'FORM_CELL_HARVEST_FINISHED',
      parts: [{
        id: 1,
        guid: '660e8400-e29b-41d4-a716-446655440001',
        display_name: 'Housing',
        end_layer: 350,
        name: 'housing_v2.stl',
        raw_mesh_hash: 'abc123',
        start_layer: 0,
        volume_ml: 45.2,
        prepared_scene: 'scene_001'
      }],
      print_intent: null
    }
  ];
  
  return res.json({
    count: prints.length,
    next: null,
    previous: null,
    results: prints
  });
});

// Handle group endpoints with parameters
app.patch('/developer/v1/groups/:group_id/', (req, res) => {
  const { group_id } = req.params;
  const { name, remote_print_enabled_override } = req.body;
  
  return res.json({
    id: group_id,
    name: name || 'Updated Group',
    remote_print_enabled_override: remote_print_enabled_override !== undefined ? remote_print_enabled_override : true,
    created_at: '2024-01-01T00:00:00Z',
    memberships: [{
      is_admin: true,
      user: 'john.doe',
      email: 'john.doe@example.com',
      first_name: 'John',
      last_name: 'Doe'
    }],
    printers: ['MOCK-PRINTER-001'],
    invitations: [],
    has_fleet_control: true,
    has_fleet_control_updated_by: 1,
    settings: {
      group: group_id,
      update_mode: 'auto'
    }
  });
});

app.delete('/developer/v1/groups/:group_id/', (req, res) => {
  return res.status(204).send();
});

app.post('/developer/v1/groups/:group_id/members/', (req, res) => {
  const { user, is_admin } = req.body;
  
  return res.status(201).json({
    is_admin: is_admin || false,
    user: user.split('@')[0],
    email: user,
    first_name: 'New',
    last_name: 'Member'
  });
});

app.put('/developer/v1/groups/:group_id/members/', (req, res) => {
  const { user, is_admin } = req.body;
  
  return res.json({
    is_admin: is_admin,
    user: user.split('@')[0],
    email: user,
    first_name: 'Updated',
    last_name: 'Member'
  });
});

app.delete('/developer/v1/groups/:group_id/members/', (req, res) => {
  return res.status(204).send();
});

app.get('/developer/v1/groups/:group_id/queue/', (req, res) => {
  return res.json([
    {
      id: '880e8400-e29b-41d4-a716-446655440003',
      name: 'Queue Item 1',
      volume_ml: 75.3,
      material_name: 'Clear Resin',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      username: 'john.doe',
      allowed_machine_type_ids: ['FORM3', 'FORM3L']
    },
    {
      id: '990e8400-e29b-41d4-a716-446655440004',
      name: 'Queue Item 2',
      volume_ml: 120.5,
      material_name: 'Tough 2000',
      created_at: new Date(Date.now() - 900000).toISOString(),
      username: 'jane.smith',
      allowed_machine_type_ids: ['FORM3L']
    }
  ]);
});

app.post('/developer/v1/groups/bulk-add-printers/', (req, res) => {
  return res.status(200).send();
});

// Swagger UI setup with custom configuration
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Formlabs API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    tryItOutEnabled: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1
  }
};

// Update the OpenAPI document to use localhost for testing
openApiDocument.servers = [
  {
    url: `http://localhost:${port}`,
    description: 'Local Mock Server'
  },
  {
    url: 'https://api.formlabs.com',
    description: 'Production Server'
  }
];

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, swaggerOptions));

// Redirect root to Swagger UI
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Default 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Mock API server running at http://localhost:${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
  console.log(`Also accessible at http://127.0.0.1:${port}/api-docs`);
  console.log('\nThe API provides realistic mock responses for all endpoints.');
  console.log('You can test the API using the "Try it out" button in Swagger UI.');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${port} is already in use. Trying port ${port + 1}...`);
    app.listen(port + 1, '0.0.0.0', () => {
      console.log(`Mock API server running at http://localhost:${port + 1}`);
      console.log(`Swagger UI available at http://localhost:${port + 1}/api-docs`);
      console.log(`Also accessible at http://127.0.0.1:${port + 1}/api-docs`);
    });
  } else {
    console.error('Server error:', err);
  }
});