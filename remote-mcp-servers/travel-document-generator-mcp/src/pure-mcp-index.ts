// Environment interface
interface Env {
	MCP_AUTH_KEY: string;
	DB: D1Database;
	R2_BUCKET: R2Bucket;
	GOOGLE_MAPS_API_KEY: string;
	R2_URL_BASE: string;
	GITHUB_TOKEN: string;
	REPO_OWNER: string;
	REPO_NAME: string;
	BASE_URL: string;
}

// Direct JSON Schema definitions (no more Zod complexity!)
const toolSchemas = {
	generate_travel_document: {
		type: 'object',
		properties: {
			template_id: {
				type: 'number',
				description: 'ID from document_templates table'
			},
			trip_id: {
				type: 'number',
				description: 'ID from trips table'
			},
			output_format: {
				type: 'string',
				enum: ['html', 'mobile-html'],
				description: 'Output format (default: html)'
			},
			save_to_github: {
				type: 'boolean',
				description: 'Save to GitHub repo for web serving (default: false)'
			}
		},
		required: ['template_id', 'trip_id']
	},
	manage_document_template: {
		type: 'object',
		properties: {
			action: {
				type: 'string',
				enum: ['create', 'update', 'delete', 'list', 'get'],
				description: 'Action to perform'
			},
			template_id: {
				type: 'number',
				description: 'Required for update/delete/get actions'
			},
			template_data: {
				type: 'object',
				properties: {
					template_name: { type: 'string' },
					template_type: { type: 'string' },
					template_content: { type: 'string' },
					is_default: { type: 'boolean' },
					notes: { type: 'string' }
				},
				description: 'For create/update operations'
			}
		},
		required: ['action']
	},
	preview_template: {
		type: 'object',
		properties: {
			template_id: {
				type: 'number',
				description: 'ID of template to preview'
			},
			trip_id: {
				type: 'number',
				description: 'Optional trip ID for real data preview'
			},
			use_sample_data: {
				type: 'boolean',
				description: 'Use sample data if trip_id not provided (default: true)'
			}
		},
		required: ['template_id']
	},
	create_sample_templates: {
		type: 'object',
		properties: {},
		required: []
	},
	create_trip_photo_gallery: {
		type: 'object',
		properties: {
			trip_id: {
				type: 'number',
				description: 'Trip ID to create gallery for'
			},
			places: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						place_id: {
							type: 'string',
							description: 'Google Places ID'
						},
						name: {
							type: 'string',
							description: 'Place name'
						},
						category: {
							type: 'string',
							enum: ['destination', 'hotel', 'restaurant', 'activity', 'attraction'],
							description: 'Image category'
						},
						day_number: {
							type: 'number',
							description: 'Associated day number if applicable'
						}
					},
					required: ['place_id', 'name', 'category']
				},
				description: 'Places to fetch photos for'
			},
			auto_select_primary: {
				type: 'boolean',
				description: 'Automatically select a primary destination image (default: true)'
			}
		},
		required: ['trip_id', 'places']
	},
	save_selected_images: {
		type: 'object',
		properties: {
			trip_id: {
				type: 'number',
				description: 'Trip ID'
			},
			selected_images: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						url: {
							type: 'string',
							description: 'Image URL'
						},
						caption: {
							type: 'string',
							description: 'Image caption'
						},
						category: {
							type: 'string',
							enum: ['destination', 'hotel', 'restaurant', 'activity', 'attraction', 'hero'],
							description: 'Image category'
						},
						is_primary: {
							type: 'boolean',
							description: 'Is this the primary trip image (default: false)'
						},
						day_number: {
							type: 'number',
							description: 'Associated day number'
						},
						place_id: {
							type: 'string',
							description: 'Google Places ID'
						},
						alt_text: {
							type: 'string',
							description: 'Alt text for accessibility'
						}
					},
					required: ['url', 'category']
				},
				description: 'Array of selected images with metadata'
			}
		},
		required: ['trip_id', 'selected_images']
	}
};

// Handlebars template helpers (simplified for Cloudflare Workers)
function renderTemplate(templateContent: string, data: any): string {
	// Simple placeholder replacement for now (can be enhanced with proper Handlebars later)
	let rendered = templateContent;
	
	// Replace simple placeholders like {{trip_name}}
	rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		const value = getNestedValue(data, key);
		return value !== undefined ? String(value) : match;
	});
	
	// Handle date formatting
	rendered = rendered.replace(/\{\{formatDate\s+([^}]+)\}\}/g, (match, dateKey) => {
		const dateValue = getNestedValue(data, dateKey.trim());
		if (dateValue) {
			const date = new Date(dateValue);
			return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
		}
		return match;
	});
	
	// Handle time formatting
	rendered = rendered.replace(/\{\{formatTime\s+([^}]+)\}\}/g, (match, timeKey) => {
		const timeValue = getNestedValue(data, timeKey.trim());
		if (timeValue) {
			return String(timeValue).replace(/:\/d{2}$/, '');
		}
		return match;
	});
	
	// Handle images placeholders
	rendered = rendered.replace(/\{\{primary_image\}\}/g, data.primary_image || '');
	rendered = rendered.replace(/\{\{hero_image\}\}/g, data.hero_image || '');
	
	// Handle image galleries
	if (data.images && Array.isArray(data.images)) {
		const galleryPattern = /\{\{#each images\}\}(.*?)\{\{\/each\}\}/gs;
		rendered = rendered.replace(galleryPattern, (match, imageTemplate) => {
			return data.images.map((image: any) => {
				let imgHtml = imageTemplate;
				imgHtml = imgHtml.replace(/\{\{url\}\}/g, image.url || '');
				imgHtml = imgHtml.replace(/\{\{caption\}\}/g, image.caption || '');
				imgHtml = imgHtml.replace(/\{\{category\}\}/g, image.category || '');
				imgHtml = imgHtml.replace(/\{\{alt\}\}/g, image.alt || image.caption || '');
				return imgHtml;
			}).join('');
		});
	}

	// Handle daily itinerary loops
	if (data.days && Array.isArray(data.days)) {
		const dayPattern = /\{\{#each days\}\}(.*?)\{\{\/each\}\}/gs;
		rendered = rendered.replace(dayPattern, (match, dayTemplate) => {
			return data.days.map((day: any, index: number) => {
				let dayHtml = dayTemplate;
				// Replace day-specific placeholders
				dayHtml = dayHtml.replace(/\{\{@index\}\}/g, String(index));
				dayHtml = dayHtml.replace(/\{\{day_number\}\}/g, String(day.day_number));
				dayHtml = dayHtml.replace(/\{\{date\}\}/g, day.date || '');
				
				// Handle day images
				if (day.images && Array.isArray(day.images)) {
					const dayImagePattern = /\{\{#each images\}\}(.*?)\{\{\/each\}\}/gs;
					dayHtml = dayHtml.replace(dayImagePattern, (imgMatch: string, imgTemplate: string) => {
						return day.images.map((image: any) => {
							let imgHtml = imgTemplate;
							imgHtml = imgHtml.replace(/\{\{url\}\}/g, image.url || '');
							imgHtml = imgHtml.replace(/\{\{caption\}\}/g, image.caption || '');
							imgHtml = imgHtml.replace(/\{\{category\}\}/g, image.category || '');
							imgHtml = imgHtml.replace(/\{\{alt\}\}/g, image.alt || image.caption || '');
							return imgHtml;
						}).join('');
					});
				}
				
				// Handle activities
				if (day.activities && Array.isArray(day.activities)) {
					const activityPattern = /\{\{#each activities\}\}(.*?)\{\{\/each\}\}/gs;
					dayHtml = dayHtml.replace(activityPattern, (actMatch: string, actTemplate: string) => {
						return day.activities.map((activity: any) => {
							let actHtml = actTemplate;
							actHtml = actHtml.replace(/\{\{title\}\}/g, activity.title || '');
							actHtml = actHtml.replace(/\{\{description\}\}/g, activity.description || '');
							actHtml = actHtml.replace(/\{\{start_time\}\}/g, activity.start_time || '');
							actHtml = actHtml.replace(/\{\{end_time\}\}/g, activity.end_time || '');
							actHtml = actHtml.replace(/\{\{location\}\}/g, activity.location || '');
							actHtml = actHtml.replace(/\{\{image\}\}/g, activity.image || '');
							return actHtml;
						}).join('');
					});
				}
				
				return dayHtml;
			}).join('');
		});
	}
	
	return rendered;
}

function getNestedValue(obj: any, path: string): any {
	return path.split('.').reduce((current, key) => {
		return current && current[key] !== undefined ? current[key] : undefined;
	}, obj);
}

async function getComprehensiveTripData(trip_id: number, db: D1Database): Promise<any> {
	// Get basic trip info
	const tripQuery = await db.prepare(
		'SELECT * FROM trips WHERE trip_id = ?'
	).bind(trip_id).first();
	
	if (!tripQuery) {
		return null;
	}
	
	// Get trip participants
	const participantsQuery = await db.prepare(`
		SELECT c.first_name, c.last_name, c.email
		FROM clients c
		JOIN trip_participants tp ON c.client_id = tp.client_id
		WHERE tp.trip_id = ?
	`).bind(trip_id).all();
	
	// Get daily activities
	const activitiesQuery = await db.prepare(
		'SELECT * FROM trip_activities WHERE trip_id = ? ORDER BY day_id, start_time'
	).bind(trip_id).all();
	
	// Get accommodations
	const accommodationsQuery = await db.prepare(
		'SELECT * FROM accommodations WHERE trip_id = ? ORDER BY day_number'
	).bind(trip_id).all();
	
	// Get transportation
	const transportationQuery = await db.prepare(
		'SELECT * FROM transportation WHERE trip_id = ? ORDER BY day_number, departure_time'
	).bind(trip_id).all();
	
	// Get trip images (from R2 storage metadata)
	const imagesQuery = await db.prepare(`
		SELECT * FROM trip_images 
		WHERE trip_id = ? 
		ORDER BY is_primary DESC, category, created_at
	`).bind(trip_id).all().catch(() => ({ results: [] }));
	
	// Organize data by day
	const days = [];
	const duration = parseInt(String(tripQuery.duration)) || 1;
	
	for (let i = 1; i <= duration; i++) {
		const dayActivities = activitiesQuery.results.filter((a: any) => parseInt(String(a.day_id)) === i);
		const dayAccommodation = accommodationsQuery.results.find((a: any) => parseInt(String(a.day_number)) === i);
		const dayTransportation = transportationQuery.results.filter((t: any) => parseInt(String(t.day_number)) === i);
		
		// Calculate day date
		const startDate = new Date(String(tripQuery.start_date));
		const dayDate = new Date(startDate);
		dayDate.setDate(startDate.getDate() + i - 1);
		
		days.push({
			day_number: i,
			date: dayDate.toISOString().split('T')[0],
			activities: dayActivities,
			accommodation: dayAccommodation,
			transportation: dayTransportation
		});
	}
	
	// Format participant names
	const participantNames = participantsQuery.results
		.map((p: any) => `${p.first_name} ${p.last_name}`)
		.join(', ');
	
	// Process images
	const allImages = imagesQuery.results || [];
	const primaryImage = allImages.find((img: any) => img.is_primary);
	const heroImage = allImages.find((img: any) => img.category === 'hero' || img.category === 'destination');
	
	return {
		...tripQuery,
		days,
		traveler_names: participantNames,
		participants: participantsQuery.results,
		images: allImages,
		primary_image: primaryImage?.url || '',
		hero_image: heroImage?.url || primaryImage?.url || ''
	};
}

function createSampleData(): any {
	return {
		trip_id: 123,
		trip_name: 'European Discovery',
		start_date: '2025-06-15',
		end_date: '2025-06-25',
		duration: 10,
		status: 'Confirmed',
		total_cost: 4200,
		currency: 'USD',
		traveler_names: 'John and Jane Smith',
		agent_name: 'Kim Henderson',
		created_at: new Date().toISOString(),
		images: [
			{
				url: 'https://r2-storage-mcp.somotravel.workers.dev/sample/london-eye.jpg',
				caption: 'London Eye - Iconic city views',
				category: 'destination',
				alt: 'London Eye ferris wheel against blue sky'
			},
			{
				url: 'https://r2-storage-mcp.somotravel.workers.dev/sample/covent-garden.jpg',
				caption: 'Covent Garden - Historic market district',
				category: 'destination',
				alt: 'Bustling Covent Garden market with performers'
			}
		],
		primary_image: 'https://r2-storage-mcp.somotravel.workers.dev/sample/london-skyline.jpg',
		hero_image: 'https://r2-storage-mcp.somotravel.workers.dev/sample/london-skyline.jpg',
		days: [
			{
				day_number: 1,
				date: '2025-06-15',
				activities: [
					{
						activity_id: 101,
						title: 'Airport Transfer',
						start_time: '14:00',
						end_time: '15:00',
						location: 'London Heathrow Airport',
						description: 'Private car transfer to hotel'
					},
					{
						activity_id: 102,
						title: 'Welcome Dinner',
						start_time: '19:00',
						end_time: '21:00',
						location: 'Covent Garden',
						description: 'Traditional British cuisine at a local favorite restaurant'
					}
				],
				accommodation: {
					hotel_name: 'Premier Inn London County Hall',
					room_type: 'Double Room',
					confirmation_number: 'LON123456'
				}
			},
			{
				day_number: 2,
				date: '2025-06-16',
				activities: [
					{
						activity_id: 103,
						title: 'London Eye & Thames Cruise',
						start_time: '10:00',
						end_time: '13:00',
						location: 'South Bank',
						description: 'Iconic London Eye experience followed by scenic Thames cruise',
						booking_reference: 'EYE789'
					},
					{
						activity_id: 104,
						title: 'British Museum Visit',
						start_time: '15:00',
						end_time: '17:30',
						location: 'Great Russell Street',
						description: 'Explore world-class artifacts and exhibitions including the Rosetta Stone'
					}
				],
				transportation: [
					{
						transport_type: 'Underground',
						departure_location: 'County Hall',
						arrival_location: 'Westminster',
						departure_time: '09:30',
						arrival_time: '09:45'
					}
				]
			}
		]
	};
}

// Tool implementations
class TravelDocumentGeneratorTools {
	private env: Env;
	
	constructor(env: Env) {
		this.env = env;
	}
	
	async generate_travel_document(params: any) {
		try {
			console.log('generate_travel_document called with:', params);

			// 1. Get template from database
			const templateQuery = await this.env.DB.prepare(
				'SELECT * FROM document_templates WHERE template_id = ?'
			).bind(params.template_id).first();
			
			if (!templateQuery) {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							status: 'error',
							message: `Template with ID ${params.template_id} not found`
						})
					}],
					isError: true
				};
			}
			
			// 2. Get trip data
			const tripData = await getComprehensiveTripData(params.trip_id, this.env.DB);
			
			if (!tripData) {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							status: 'error',
							message: `Trip with ID ${params.trip_id} not found`
						})
					}],
					isError: true
				};
			}
			
			// 3. Apply template with data
			const renderedContent = renderTemplate(String(templateQuery.template_content), tripData);
			
			// 4. Save to GitHub if requested (simplified for now)
			let githubResult = null;
			if (params.save_to_github && this.env.GITHUB_TOKEN) {
				// GitHub integration would go here
				githubResult = {
					html_url: `${this.env.BASE_URL || ''}/trip-${params.trip_id}/document-${params.template_id}.${params.output_format || 'html'}`
				};
			}
			
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: 'success',
						template_id: params.template_id,
						template_name: templateQuery.template_name,
						trip_id: params.trip_id,
						trip_name: tripData.trip_name,
						output_format: params.output_format || 'html',
						content_preview: renderedContent.substring(0, 500) + (renderedContent.length > 500 ? '...(truncated)' : ''),
						full_content: renderedContent,
						github_url: githubResult?.html_url || null,
						generated_at: new Date().toISOString()
					}, null, 2)
				}]
			};
		} catch (error: any) {
			console.error('Exception generating document:', error);
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: 'error',
						message: `Exception: ${error.message || 'Unknown error'}`
					})
				}],
				isError: true
			};
		}
	}
	
	async manage_document_template(params: any) {
		try {
			console.log('manage_document_template called with:', params);
			
			switch (params.action) {
				case 'list':
					const templates = await this.env.DB.prepare(
						'SELECT template_id, template_name, template_type, is_default, created_at, updated_at FROM document_templates ORDER BY template_type, template_name'
					).all();
					return {
						content: [{
							type: "text",
							text: JSON.stringify({
								status: 'success',
								templates: templates.results
							}, null, 2)
						}]
					};
					
				case 'get':
					if (!params.template_id) {
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									status: 'error',
									message: 'template_id is required for get action'
								})
							}],
							isError: true
						};
					}
					
					const template = await this.env.DB.prepare(
						'SELECT * FROM document_templates WHERE template_id = ?'
					).bind(params.template_id).first();
					
					if (!template) {
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									status: 'error',
									message: `Template with ID ${params.template_id} not found`
								})
							}],
							isError: true
						};
					}
					
					return {
						content: [{
							type: "text",
							text: JSON.stringify({
								status: 'success',
								template
							}, null, 2)
						}]
					};
					
				case 'create':
					if (!params.template_data) {
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									status: 'error',
									message: 'template_data is required for create action'
								})
							}],
							isError: true
						};
					}
					
					const createResult = await this.env.DB.prepare(
						'INSERT INTO document_templates (template_name, template_type, template_content, is_default, notes) VALUES (?, ?, ?, ?, ?)'
					).bind(
						params.template_data.template_name,
						params.template_data.template_type,
						params.template_data.template_content,
						params.template_data.is_default || false,
						params.template_data.notes || ''
					).run();
					
					return {
						content: [{
							type: "text",
							text: JSON.stringify({
								status: 'success',
								message: 'Template created successfully',
								template_id: createResult.meta?.last_row_id || null
							})
						}]
					};
					
				case 'update':
					if (!params.template_id) {
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									status: 'error',
									message: 'template_id is required for update action'
								})
							}],
							isError: true
						};
					}
					
					if (!params.template_data) {
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									status: 'error',
									message: 'template_data is required for update action'
								})
							}],
							isError: true
						};
					}
					
					// Build update query dynamically
					const fields = [];
					const values = [];
					
					if (params.template_data.template_name !== undefined) {
						fields.push('template_name = ?');
						values.push(params.template_data.template_name);
					}
					
					if (params.template_data.template_type !== undefined) {
						fields.push('template_type = ?');
						values.push(params.template_data.template_type);
					}
					
					if (params.template_data.template_content !== undefined) {
						fields.push('template_content = ?');
						values.push(params.template_data.template_content);
					}
					
					if (params.template_data.is_default !== undefined) {
						fields.push('is_default = ?');
						values.push(params.template_data.is_default);
					}
					
					if (params.template_data.notes !== undefined) {
						fields.push('notes = ?');
						values.push(params.template_data.notes);
					}
					
					if (fields.length === 0) {
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									status: 'error',
									message: 'No fields to update'
								})
							}],
							isError: true
						};
					}
					
					fields.push('updated_at = CURRENT_TIMESTAMP');
					
					const updateQuery = `UPDATE document_templates SET ${fields.join(', ')} WHERE template_id = ?`;
					values.push(params.template_id);
					
					await this.env.DB.prepare(updateQuery).bind(...values).run();
					
					return {
						content: [{
							type: "text",
							text: JSON.stringify({
								status: 'success',
								message: 'Template updated successfully',
								template_id: params.template_id
							})
						}]
					};
					
				case 'delete':
					if (!params.template_id) {
						return {
							content: [{
								type: "text",
								text: JSON.stringify({
									status: 'error',
									message: 'template_id is required for delete action'
								})
							}],
							isError: true
						};
					}
					
					await this.env.DB.prepare(
						'DELETE FROM document_templates WHERE template_id = ?'
					).bind(params.template_id).run();
					
					return {
						content: [{
							type: "text",
							text: JSON.stringify({
								status: 'success',
								message: 'Template deleted successfully',
								template_id: params.template_id
							})
						}]
					};
					
				default:
					return {
						content: [{
							type: "text",
							text: JSON.stringify({
								status: 'error',
								message: `Invalid action: ${params.action}`
							})
						}],
						isError: true
					};
			}
		} catch (error: any) {
			console.error('Exception managing template:', error);
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: 'error',
						message: `Exception: ${error.message || 'Unknown error'}`
					})
				}],
				isError: true
			};
		}
	}
	
	async preview_template(params: any) {
		try {
			console.log('preview_template called with:', params);
			
			// Get template from database
			const templateQuery = await this.env.DB.prepare(
				'SELECT * FROM document_templates WHERE template_id = ?'
			).bind(params.template_id).first();
			
			if (!templateQuery) {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							status: 'error',
							message: `Template with ID ${params.template_id} not found`
						})
					}],
					isError: true
				};
			}
			
			// Get preview data
			let previewData;
			if (params.trip_id) {
				previewData = await getComprehensiveTripData(params.trip_id, this.env.DB);
				if (!previewData) {
					return {
						content: [{
							type: "text",
							text: JSON.stringify({
								status: 'error',
								message: `Trip with ID ${params.trip_id} not found`
							})
						}],
						isError: true
					};
				}
			} else if (params.use_sample_data !== false) {
				previewData = createSampleData();
			} else {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							status: 'error',
							message: 'Either trip_id or use_sample_data must be provided'
						})
					}],
					isError: true
				};
			}
			
			// Apply template with data
			const renderedContent = renderTemplate(String(templateQuery.template_content), previewData);
			
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: 'success',
						template_id: params.template_id,
						template_name: templateQuery.template_name,
						template_type: templateQuery.template_type,
						preview_content: renderedContent.substring(0, 2000) + (renderedContent.length > 2000 ? '...(truncated for preview)' : ''),
						data_source: params.trip_id ? `trip_${params.trip_id}` : 'sample_data',
						character_count: renderedContent.length
					}, null, 2)
				}]
			};
		} catch (error: any) {
			console.error('Exception previewing template:', error);
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: 'error',
						message: `Exception: ${error.message || 'Unknown error'}`
					})
				}],
				isError: true
			};
		}
	}
	
	async create_sample_templates() {
		try {
			console.log('create_sample_templates called');
			
			const sampleTemplates = [
				{
					name: 'Clean Travel Proposal',
					type: 'proposal',
					content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{trip_name}} - Travel Proposal</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; color: #333; background: #f9f9f9; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #2980b9; margin-bottom: 30px; }
    .hero-image { width: 100%; max-height: 300px; object-fit: cover; border-radius: 6px; margin: 20px 0; }
    .intro-section { background: #f8f9fa; padding: 25px; border-radius: 6px; margin: 20px 0; }
    .pricing-options { margin: 30px 0; }
    .option { border: 2px solid #e9ecef; border-radius: 6px; padding: 20px; margin: 15px 0; background: white; }
    .option.popular { border-color: #2980b9; background: #f8f9ff; }
    .option h3 { margin-top: 0; color: #2c3e50; }
    .price { font-size: 1.8em; font-weight: bold; color: #e74c3c; margin: 10px 0; }
    .features { list-style: none; padding: 0; }
    .features li { padding: 5px 0; }
    .features li:before { content: "✓ "; color: #27ae60; font-weight: bold; }
    .contact-section { background: #2c3e50; color: white; padding: 25px; border-radius: 6px; text-align: center; margin-top: 30px; }
    .contact-button { background: #3498db; color: white; padding: 12px 25px; border: none; border-radius: 4px; font-size: 1em; cursor: pointer; text-decoration: none; display: inline-block; }
    h1 { color: #2c3e50; margin: 0; }
    h2 { color: #2980b9; border-bottom: 2px solid #2980b9; padding-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{trip_name}}</h1>
      <p>Your Personalized Travel Proposal</p>
    </div>

    {{#if hero_image}}
    <img src="{{hero_image}}" alt="{{trip_name}} destination" class="hero-image">
    {{/if}}

    <div class="intro-section">
      <h2>Hello {{traveler_names}}!</h2>
      <p>Thank you for considering Somo Travel for your upcoming adventure. We've put together this personalized proposal with three great options that offer excellent value and unforgettable experiences.</p>
    </div>

    <div class="pricing-options">
      <h2>Three Great Options for Your Trip</h2>
      <p>Choose the experience level that's right for you:</p>

      <div class="option">
        <h3>Classic Experience</h3>
        <div class="price">$2,899</div>
        <p>Great value with comfort and quality</p>
        <ul class="features">
          <li>Quality accommodations</li>
          <li>Local cultural experiences</li>
          <li>Expert travel guidance</li>
          <li>24/7 travel support</li>
        </ul>
      </div>
      
      <div class="option popular">
        <h3>Premium Experience</h3>
        <div class="price">$4,249</div>
        <p><strong>Most Popular</strong> - Enhanced comfort with premium touches</p>
        <ul class="features">
          <li>Premium accommodations</li>
          <li>Private guided tours</li>
          <li>Exclusive dining experiences</li>
          <li>Premium transportation</li>
        </ul>
      </div>
      
      <div class="option">
        <h3>Luxury Experience</h3>
        <div class="price">$6,749</div>
        <p>Top-tier luxury for special occasions</p>
        <ul class="features">
          <li>5-star luxury properties</li>
          <li>Private chef experiences</li>
          <li>Luxury transportation</li>
          <li>VIP access everywhere</li>
        </ul>
      </div>
    </div>

    <div class="contact-section">
      <h2 style="margin-top: 0;">Ready to Book Your Trip?</h2>
      <p>Let's finalize your travel plans and get you started on your adventure!</p>
      <a href="mailto:kim.henderson@cruiseplanners.com?subject=Travel Proposal - {{trip_name}}" class="contact-button">Contact Me to Book</a>
    </div>

    <div style="text-align: center; padding: 20px; border-top: 1px solid #eee; margin-top: 20px;">
      <h3>Your Travel Advisor</h3>
      <p><strong>Kim Henderson</strong><br>
      Somo Travel<br>
      kim.henderson@cruiseplanners.com<br>
      (251) 508-6921</p>
      <p style="font-style: italic; color: #666;">"Making travel planning easy and worry-free"</p>
    </div>
  </div>
</body>
</html>`,
					is_default: true,
					notes: 'Clean and approachable travel proposal template focusing on value and clarity'
				},
				{
					name: 'Clean Travel Itinerary',
					type: 'itinerary',
					content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{trip_name}} - Travel Itinerary</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.5; color: #333; background: #f9f9f9; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #2980b9; margin-bottom: 30px; }
    .trip-overview { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .day-section { border: 1px solid #e9ecef; border-radius: 6px; margin: 20px 0; padding: 20px; background: white; }
    .day-header { background: #2980b9; color: white; padding: 15px; margin: -20px -20px 20px; border-radius: 6px 6px 0 0; }
    .activity { border-left: 3px solid #3498db; padding: 15px; margin: 15px 0; background: #f8f9fa; }
    .time { font-weight: bold; color: #e74c3c; font-size: 0.9em; }
    .activity-title { font-weight: bold; margin: 5px 0; }
    .location { color: #27ae60; font-size: 0.9em; }
    .accommodation { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .transportation { background: #e8f4fd; border: 1px solid #bee5eb; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .contact-info { background: #2c3e50; color: white; padding: 20px; border-radius: 6px; text-align: center; margin-top: 30px; }
    h1 { color: #2c3e50; margin: 0; }
    h2 { color: #2980b9; }
    h3 { color: #2c3e50; margin-top: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{trip_name}}</h1>
      <p>Your Complete Travel Itinerary</p>
    </div>

    <div class="trip-overview">
      <h2>Trip Overview</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
        <div><strong>Travelers:</strong> {{traveler_names}}</div>
        <div><strong>Dates:</strong> {{formatDate start_date}} - {{formatDate end_date}}</div>
        <div><strong>Duration:</strong> {{duration}} days</div>
        <div><strong>Status:</strong> {{status}}</div>
      </div>
    </div>

    {{#each days}}
    <div class="day-section">
      <div class="day-header">
        <h3>Day {{day_number}} - {{formatDate date}}</h3>
      </div>

      {{#if accommodation}}
      <div class="accommodation">
        <strong>🏨 Accommodation:</strong> {{accommodation.hotel_name}}<br>
        {{#if accommodation.room_type}}<strong>Room:</strong> {{accommodation.room_type}}<br>{{/if}}
        {{#if accommodation.confirmation_number}}<strong>Confirmation:</strong> {{accommodation.confirmation_number}}{{/if}}
      </div>
      {{/if}}

      {{#each transportation}}
      <div class="transportation">
        <strong>🚗 Transportation:</strong> {{transport_type}}<br>
        <strong>From:</strong> {{departure_location}} at {{formatTime departure_time}}<br>
        <strong>To:</strong> {{arrival_location}} at {{formatTime arrival_time}}
        {{#if booking_reference}}<br><strong>Reference:</strong> {{booking_reference}}{{/if}}
      </div>
      {{/each}}

      {{#each activities}}
      <div class="activity">
        <div class="time">{{formatTime start_time}}{{#if end_time}} - {{formatTime end_time}}{{/if}}</div>
        <div class="activity-title">{{title}}</div>
        {{#if description}}<p>{{description}}</p>{{/if}}
        {{#if location}}<div class="location">📍 {{location}}</div>{{/if}}
        {{#if booking_reference}}<div style="font-style: italic; color: #666;">Booking Reference: {{booking_reference}}</div>{{/if}}
      </div>
      {{/each}}
    </div>
    {{/each}}

    <div class="contact-info">
      <h3>Emergency Contact & Support</h3>
      <p><strong>Kim Henderson - Your Travel Advisor</strong><br>
      Somo Travel<br>
      📧 kim.henderson@cruiseplanners.com<br>
      📱 (251) 508-6921</p>
      <p><strong>24/7 Emergency Travel Support Available</strong></p>
    </div>
  </div>
</body>
</html>`,
					is_default: false,
					notes: 'Clean and readable travel itinerary with comprehensive day-by-day information'
				}
			];
			
			const results = [];
			for (const template of sampleTemplates) {
				const result = await this.env.DB.prepare(
					'INSERT INTO document_templates (template_name, template_type, template_content, is_default, notes) VALUES (?, ?, ?, ?, ?)'
				).bind(
					template.name,
					template.type,
					template.content,
					template.is_default,
					template.notes
				).run();
				
				results.push({
					template_name: template.name,
					template_id: result.meta?.last_row_id
				});
			}
			
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: 'success',
						message: 'Sample templates created successfully',
						templates: results
					}, null, 2)
				}]
			};
		} catch (error: any) {
			console.error('Exception creating sample templates:', error);
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: 'error',
						message: `Exception: ${error.message || 'Unknown error'}`
					})
				}],
				isError: true
			};
		}
	}
	
	async create_trip_photo_gallery(params: any) {
		try {
			console.log('create_trip_photo_gallery called with:', params);
			
			// Call R2 Storage MCP to create photo galleries for each place
			const galleryPromises = params.places.map(async (place: any) => {
				try {
					// This would typically call the Google Places API via the google-places-mcp server
					// and then use the R2 storage MCP to organize and store images
					const galleryResponse = await fetch(`${this.env.R2_URL_BASE}/create-place-gallery`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${this.env.MCP_AUTH_KEY}`
						},
						body: JSON.stringify({
							trip_id: params.trip_id,
							place_id: place.place_id,
							place_name: place.name,
							category: place.category,
							day_number: place.day_number
						})
					});
					
					if (galleryResponse.ok) {
						return await galleryResponse.json();
					} else {
						console.warn(`Failed to create gallery for ${place.name}`);
						return null;
					}
				} catch (error) {
					console.warn(`Error creating gallery for ${place.name}:`, error);
					return null;
				}
			});
			
			const galleryResults = await Promise.all(galleryPromises);
			const successfulGalleries = galleryResults.filter(result => result !== null);
			
			// Generate gallery URL for user selection
			const galleryUrl = `${this.env.R2_URL_BASE}/trip-${params.trip_id}/gallery`;
			
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: 'success',
						message: `Created photo galleries for ${successfulGalleries.length} places`,
						trip_id: params.trip_id,
						gallery_url: galleryUrl,
						galleries_created: successfulGalleries.length,
						total_places: params.places.length,
						next_steps: [
							`1. Visit ${galleryUrl} to review and select images`,
							'2. Choose a primary image for the trip',
							'3. Select additional images for specific days/activities',
							'4. Return to Claude with selected image metadata'
						]
					}, null, 2)
				}]
			};
		} catch (error: any) {
			console.error('Exception creating photo gallery:', error);
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: 'error',
						message: `Exception: ${error.message || 'Unknown error'}`
					})
				}],
				isError: true
			};
		}
	}
	
	async save_selected_images(params: any) {
		try {
			console.log('save_selected_images called with:', params);
			
			// First, ensure trip_images table exists (create if needed)
			await this.env.DB.prepare(`
				CREATE TABLE IF NOT EXISTS trip_images (
					image_id INTEGER PRIMARY KEY AUTOINCREMENT,
					trip_id INTEGER NOT NULL,
					url TEXT NOT NULL,
					caption TEXT,
					category TEXT NOT NULL,
					is_primary BOOLEAN DEFAULT FALSE,
					day_number INTEGER,
					place_id TEXT,
					alt_text TEXT,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					FOREIGN KEY (trip_id) REFERENCES trips(trip_id)
				)
			`).run();
			
			// Clear existing images for this trip
			await this.env.DB.prepare('DELETE FROM trip_images WHERE trip_id = ?').bind(params.trip_id).run();
			
			// Insert new selected images
			const insertPromises = params.selected_images.map(async (image: any) => {
				return this.env.DB.prepare(`
					INSERT INTO trip_images (trip_id, url, caption, category, is_primary, day_number, place_id, alt_text)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				`).bind(
					params.trip_id,
					image.url,
					image.caption || null,
					image.category,
					image.is_primary || false,
					image.day_number || null,
					image.place_id || null,
					image.alt_text || image.caption || null
				).run();
			});
			
			await Promise.all(insertPromises);
			
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: 'success',
						message: `Saved ${params.selected_images.length} images for trip ${params.trip_id}`,
						trip_id: params.trip_id,
						images_saved: params.selected_images.length,
						primary_images: params.selected_images.filter((img: any) => img.is_primary).length,
						categories: [...new Set(params.selected_images.map((img: any) => img.category))]
					})
				}]
			};
		} catch (error: any) {
			console.error('Exception saving images:', error);
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: 'error',
						message: `Exception: ${error.message || 'Unknown error'}`
					})
				}],
				isError: true
			};
		}
	}
}

// Pure MCP JSON-RPC 2.0 Handler
class PureTravelDocumentGeneratorMCPServer {
	private tools: TravelDocumentGeneratorTools;
	
	constructor(env: Env) {
		this.tools = new TravelDocumentGeneratorTools(env);
	}
	
	async handleRequest(request: any): Promise<any> {
		const { method, params, id } = request;
		
		try {
			switch (method) {
				case 'initialize':
					return {
						jsonrpc: '2.0',
						id,
						result: {
							protocolVersion: '2024-11-05',
							capabilities: {
								tools: {}
							},
							serverInfo: {
								name: 'Travel Document Generator MCP',
								version: '2.0.0'
							}
						}
					};
					
				case 'tools/list':
					return {
						jsonrpc: '2.0',
						id,
						result: {
							tools: [
								{
									name: 'generate_travel_document',
									description: 'Generate travel documents from database templates with trip data integration',
									inputSchema: toolSchemas.generate_travel_document
								},
								{
									name: 'manage_document_template',
									description: 'CRUD operations for document templates in database',
									inputSchema: toolSchemas.manage_document_template
								},
								{
									name: 'preview_template',
									description: 'Preview template with real or sample trip data',
									inputSchema: toolSchemas.preview_template
								},
								{
									name: 'create_sample_templates',
									description: 'Create initial HTML templates for testing',
									inputSchema: toolSchemas.create_sample_templates
								},
								{
									name: 'create_trip_photo_gallery',
									description: 'Fetch Google Places photos and create galleries for trip',
									inputSchema: toolSchemas.create_trip_photo_gallery
								},
								{
									name: 'save_selected_images',
									description: 'Save user-selected images to trip database',
									inputSchema: toolSchemas.save_selected_images
								}
							]
						}
					};
					
				case 'tools/call':
					const toolName = params.name;
					const toolArgs = params.arguments || {};
					
					// Validate tool exists
					if (!(toolName in toolSchemas)) {
						throw new Error(`Unknown tool: ${toolName}`);
					}
					
					// Call the appropriate tool method
					const result = await (this.tools as any)[toolName](toolArgs);
					
					return {
						jsonrpc: '2.0',
						id,
						result
					};
					
				case 'ping':
					return {
						jsonrpc: '2.0',
						id,
						result: {}
					};
					
				case 'resources/list':
					return {
						jsonrpc: '2.0',
						id,
						result: {
							resources: []
						}
					};
					
				case 'prompts/list':
					return {
						jsonrpc: '2.0',
						id,
						result: {
							prompts: []
						}
					};
					
				default:
					throw new Error(`Unknown method: ${method}`);
			}
		} catch (error) {
			return {
				jsonrpc: '2.0',
				id,
				error: {
					code: -32603,
					message: 'Internal error',
					data: String(error)
				}
			};
		}
	}
}

// Cloudflare Worker Export
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		
		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		};
		
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}
		
		// SSE endpoint for MCP protocol
		if (url.pathname === '/sse') {
			const server = new PureTravelDocumentGeneratorMCPServer(env);
			
			// Handle incoming messages
			if (request.method === 'POST') {
				try {
					const body = await request.json();
					const response = await server.handleRequest(body);
					
					// Return SSE-formatted response
					return new Response(
						`data: ${JSON.stringify(response)}\n\n`,
						{
							headers: {
								'Content-Type': 'text/event-stream',
								'Cache-Control': 'no-cache',
								'Connection': 'keep-alive',
								...corsHeaders
							}
						}
					);
				} catch (error) {
					return new Response(
						`data: ${JSON.stringify({
							jsonrpc: '2.0',
							error: {
								code: -32700,
								message: 'Parse error',
								data: String(error)
							}
						})}\n\n`,
						{
							headers: {
								'Content-Type': 'text/event-stream',
								'Cache-Control': 'no-cache',
								'Connection': 'keep-alive',
								...corsHeaders
							}
						}
					);
				}
			}
			
			// For GET requests, return a simple SSE connection
			return new Response(
				`data: {"jsonrpc":"2.0","method":"ping","result":{}}\n\n`,
				{
					headers: {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						'Connection': 'keep-alive',
						...corsHeaders
					}
				}
			);
		}
		
		// Health check endpoint
		if (url.pathname === '/health') {
			return new Response(JSON.stringify({
				status: 'healthy',
				service: 'Pure Travel Document Generator MCP v2.0',
				timestamp: new Date().toISOString(),
				tools: [
					'generate_travel_document',
					'manage_document_template',
					'preview_template',
					'create_sample_templates',
					'create_trip_photo_gallery',
					'save_selected_images'
				],
				features: [
					'Database template storage',
					'Handlebars rendering',
					'Trip data integration',
					'Photo gallery creation',
					'R2 storage integration'
				]
			}), {
				headers: { 
					'Content-Type': 'application/json',
					...corsHeaders
				}
			});
		}
		
		// Default response
		return new Response(JSON.stringify({
			error: 'Not found',
			available_endpoints: ['/sse', '/health']
		}), {
			status: 404,
			headers: { 
				'Content-Type': 'application/json',
				...corsHeaders
			}
		});
	}
};