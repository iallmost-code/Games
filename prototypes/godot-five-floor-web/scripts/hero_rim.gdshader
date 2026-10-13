shader_type canvas_item;
render_mode unshaded;
// One hero-only silhouette pass. No enemy filters, blur or new textures.
uniform vec4 rim_color : source_color = vec4(0.72,0.54,0.94,1.0);
uniform vec4 frame_rect = vec4(0.0,0.0,1.0,1.0);
varying vec4 vertex_tint;
float frame_mask(vec2 position, vec2 pixel_size){
    vec2 first=frame_rect.xy+pixel_size*0.5;
    vec2 last=frame_rect.zw-pixel_size*0.5;
    if(any(lessThan(position,first)) || any(greaterThan(position,last)))return 0.0;
    return 1.0;
}
void vertex(){vertex_tint=COLOR;}
void fragment(){
    vec2 d=TEXTURE_PIXEL_SIZE*3.0;
    float inside=texture(TEXTURE,UV).a*frame_mask(UV,TEXTURE_PIXEL_SIZE);
    vec2 east=UV+vec2(d.x,0.0),west=UV-vec2(d.x,0.0),north=UV-vec2(0.0,d.y),south=UV+vec2(0.0,d.y);
    float outside=max(max(texture(TEXTURE,east).a*frame_mask(east,TEXTURE_PIXEL_SIZE),texture(TEXTURE,west).a*frame_mask(west,TEXTURE_PIXEL_SIZE)),max(texture(TEXTURE,north).a*frame_mask(north,TEXTURE_PIXEL_SIZE),texture(TEXTURE,south).a*frame_mask(south,TEXTURE_PIXEL_SIZE)));
    outside=max(outside,max(texture(TEXTURE,UV+d).a*frame_mask(UV+d,TEXTURE_PIXEL_SIZE),texture(TEXTURE,UV-d).a*frame_mask(UV-d,TEXTURE_PIXEL_SIZE)));
    float rim=max(0.0,outside-inside);
    COLOR=vec4(rim_color.rgb,rim*0.64*vertex_tint.a);
}
