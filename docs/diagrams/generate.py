import os

def create_drawio_xml(cells):
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="Electron" modified="2026-04-24T12:00:00.000Z" agent="Mozilla/5.0" version="21.2.8" type="device">
  <diagram id="diagram1" name="Page-1">
    <mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
{cells}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>"""

def create_rect(id, value, x, y, width, height, style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;opaque=1;strokeWidth=2;fontStyle=1;"):
    return f"""        <mxCell id="{id}" value="{value}" style="{style}" vertex="1" parent="1">
          <mxGeometry x="{x}" y="{y}" width="{width}" height="{height}" as="geometry" />
        </mxCell>"""

def create_edge(id, source, target, value="", style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;fontColor=#000000;jumpStyle=arc;"):
    return f"""        <mxCell id="{id}" value="{value}" style="{style}" edge="1" parent="1" source="{source}" target="{target}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>"""

def create_erd_table(id, name, attributes, x, y, width):
    height = 30 + 25 * len(attributes)
    # Added swimlaneFillColor=#ffffff and shadow=1
    header_style = "swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=30;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;swimlaneFillColor=#ffffff;fontColor=#000000;opaque=1;strokeWidth=1;shadow=1;"
    # Added fontColor=#000000
    attr_style = "text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;rotatable=0;whiteSpace=wrap;html=1;fontColor=#000000;"
    
    table_xml = [f'        <mxCell id="{id}" value="{name}" style="{header_style}" vertex="1" parent="1">']
    table_xml.append(f'          <mxGeometry x="{x}" y="{y}" width="{width}" height="{height}" as="geometry" />')
    table_xml.append('        </mxCell>')
    
    for i, attr in enumerate(attributes):
        attr_id = f"{id}_a{i}"
        table_xml.append(f'        <mxCell id="{attr_id}" value="{attr}" style="{attr_style}" vertex="1" parent="{id}">')
        table_xml.append(f'          <mxGeometry y="{30 + i*25}" width="{width}" height="25" as="geometry" />')
        table_xml.append('        </mxCell>')
    
    return "\n".join(table_xml)

def generate_flowchart():
    cells = []
    # Edges (Background)
    cells.append(create_edge("e1", "start", "role_sel"))
    cells.append(create_edge("e2", "role_sel", "jobseeker_reg"))
    cells.append(create_edge("e3", "role_sel", "employer_reg"))
    cells.append(create_edge("e4", "role_sel", "individual_reg"))
    cells.append(create_edge("e5", "jobseeker_reg", "jobseeker_dash"))
    cells.append(create_edge("e6", "employer_reg", "employer_dash"))
    cells.append(create_edge("e7", "individual_reg", "individual_dash"))
    cells.append(create_edge("e8", "jobseeker_dash", "js_browse"))
    cells.append(create_edge("e9", "js_browse", "js_apply"))
    cells.append(create_edge("e10", "employer_dash", "emp_post"))
    cells.append(create_edge("e11", "employer_dash", "emp_review"))
    cells.append(create_edge("e12", "individual_dash", "ind_diag"))
    cells.append(create_edge("e13", "ind_diag", "ind_view"))
    cells.append(create_edge("e14", "admin_dash", "admin_ver"))
    cells.append(create_edge("e15", "admin_dash", "admin_stats"))
    cells.append(create_edge("e16", "js_apply", "messaging"))
    cells.append(create_edge("e17", "emp_review", "messaging"))
    cells.append(create_edge("e18", "ind_view", "messaging"))

    # Shapes (Foreground)
    cells.append(create_rect("start", "Landing Page\\nLogin / Register", 350, 50, 150, 50))
    cells.append(create_rect("role_sel", "Select Role", 350, 150, 150, 50))
    cells.append(create_rect("jobseeker_reg", "Jobseeker Registration\\n(6 steps)", 100, 250, 150, 60))
    cells.append(create_rect("employer_reg", "Employer Registration\\n(4 steps)", 350, 250, 150, 60))
    cells.append(create_rect("individual_reg", "Individual Registration\\n(2 steps)", 600, 250, 150, 60))
    cells.append(create_rect("jobseeker_dash", "Jobseeker Dashboard", 100, 350, 150, 50))
    cells.append(create_rect("employer_dash", "Employer Dashboard", 350, 350, 150, 50))
    cells.append(create_rect("individual_dash", "Individual Dashboard", 600, 350, 150, 50))
    cells.append(create_rect("admin_dash", "Admin Dashboard", 850, 350, 150, 50))
    cells.append(create_rect("js_browse", "Browse Jobs\\n(Hybrid AI Match &amp; Breakdown)", 100, 450, 150, 60))
    cells.append(create_rect("js_apply", "Apply to Job", 100, 550, 150, 50))
    cells.append(create_rect("emp_post", "Post Job\\n(AI Skill Recs)", 350, 450, 150, 60))
    cells.append(create_rect("emp_review", "Review Applicants\\n(inferential-v9 scores)", 350, 550, 150, 60))
    cells.append(create_rect("ind_diag", "Diagnostic Search\\n(Service Needs)", 600, 450, 150, 60))
    cells.append(create_rect("ind_view", "View Matched Workers", 600, 550, 150, 50))
    cells.append(create_rect("admin_ver", "Verify Users\\n(Approve/Reject &amp; Email)", 850, 450, 150, 60))
    cells.append(create_rect("admin_stats", "View Platform Stats\\n&amp; Telemetry", 850, 550, 150, 60))
    cells.append(create_rect("messaging", "Real-Time Messaging System\\n(All Users)", 475, 700, 200, 60))
    return create_drawio_xml("\n".join(cells))


def generate_system_architecture():
    cells = []
    # --- Background Edges (First) ---
    edge_style = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;"
    cells.append(create_edge("e_c_p", "clients", "presentation", style=edge_style))
    cells.append(create_edge("e_p_b", "presentation", "backend", style=edge_style))
    cells.append(create_edge("e_b_s1", "supa_func", "groq", style=edge_style))
    cells.append(create_edge("e_b_s2", "supa_func", "resend", style=edge_style))

    # --- Foreground Shapes (Second) ---
    # Container Style
    container_style = "swimlane;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;startSize=30;opaque=1;strokeWidth=2;shadow=1;fontStyle=1;swimlaneFillColor=#ffffff;"
    
    # Layer 1: Client
    cells.append(create_rect("clients", "CLIENT LAYER", 50, 50, 700, 100, style=container_style))
    cells.append(create_rect("browser", "WEB BROWSER (DESKTOP / MOBILE)\\nReact Application Interface", 150, 90, 500, 40))
    
    # Layer 2: Presentation
    cells.append(create_rect("presentation", "PRESENTATION LAYER (FRONTEND)", 50, 200, 700, 160, style=container_style))
    cells.append(create_rect("react", "REACT 18\\nCOMPONENTS", 100, 250, 150, 60))
    cells.append(create_rect("vite", "VITE &amp; TAILWIND\\nBUILD TOOLS", 300, 250, 150, 60))
    cells.append(create_rect("state", "AUTH &amp; TELEMETRY\\nSTATE MGMT", 500, 250, 150, 60))
    
    # Layer 3: Backend
    cells.append(create_rect("backend", "DATA &amp; LOGIC LAYER (BACKEND)", 50, 410, 700, 220, style=container_style))
    cells.append(create_rect("supa_auth", "SUPABASE AUTH\\n(JWT/Session)", 100, 460, 150, 60))
    
    db_style = "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;opaque=1;strokeWidth=2;fontStyle=1;shadow=1;"
    cells.append(create_rect("supa_db", "SUPABASE DB\\n(POSTGRESQL)", 300, 460, 150, 90, style=db_style))
    
    cells.append(create_rect("supa_rt", "REALTIME\\n(WebSockets)", 500, 460, 150, 60))
    cells.append(create_rect("supa_func", "EDGE FUNCTIONS\\n(Deno Runtime)", 300, 570, 150, 45))
    
    # Layer 4: External
    cells.append(create_rect("services", "EXTERNAL AI &amp; COMMUNICATION", 50, 680, 700, 130, style=container_style))
    cells.append(create_rect("groq", "AI SERVICES\\n(GEMINI / COHERE / GROQ)", 200, 730, 200, 60))
    cells.append(create_rect("resend", "RESEND API\\n(EMAIL)", 450, 730, 150, 60))
    
    return create_drawio_xml("\n".join(cells))


def generate_context_diagram():
    cells = []
    # Edges
    cells.append(create_edge("e_j_s", "jobseeker", "system", "Profile Data, Job Apps,\\nTelemetry\\n-&gt;"))
    cells.append(create_edge("e_s_j", "system", "jobseeker", "&lt;- Match Scores,\\nSkill Breakdowns, Emails", style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;fontColor=#000000;dashed=1;jumpStyle=arc;"))
    cells.append(create_edge("e_e_s", "employer", "system", "Company Info, Job Postings,\\nApplicant Reviews\\n-&gt;"))
    cells.append(create_edge("e_s_e", "system", "employer", "&lt;- AI Skill Recs,\\nApplicant Scores, Emails", style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;fontColor=#000000;dashed=1;jumpStyle=arc;"))
    cells.append(create_edge("e_i_s", "individual", "system", "Service Requests\\n-&gt;"))
    cells.append(create_edge("e_s_i", "system", "individual", "&lt;- Matched Workers,\\nMessages", style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;fontColor=#000000;dashed=1;jumpStyle=arc;"))
    cells.append(create_edge("e_a_s", "admin", "system", "Verification Decisions,\\nUser Management\\n-&gt;"))
    cells.append(create_edge("e_s_a", "system", "admin", "&lt;- Pending Registrations,\\nTelemetry Stats", style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;fontColor=#000000;dashed=1;jumpStyle=arc;"))

    # Shapes
    cells.append(create_rect("system", "PESO-Connect\\nPlatform", 350, 250, 150, 150, style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;fontStyle=1;opaque=1;"))
    cells.append(create_rect("jobseeker", "Jobseeker", 50, 50, 150, 60))
    cells.append(create_rect("employer", "Employer", 650, 50, 150, 60))
    cells.append(create_rect("individual", "Individual\\n(Homeowner)", 50, 500, 150, 60))
    cells.append(create_rect("admin", "PESO Administrator", 650, 500, 150, 60))
    return create_drawio_xml("\n".join(cells))


def generate_dfd_level_1():
    cells = []
    # --- Background Edges (First) ---
    # Using ortho with rounded corners and clear lanes
    lane_edge = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;fontColor=#000000;jumpStyle=arc;strokeWidth=1.5;"
    
    # User -> Processes (Lanes: 155, 275, 395, 515)
    cells.append(create_edge("df1", "j", "p1", style=lane_edge))
    cells.append(create_edge("df2", "j", "p2", style=lane_edge))
    cells.append(create_edge("df3", "j", "p4", style=lane_edge))
    cells.append(create_edge("df4", "j", "p6", style=lane_edge))
    
    # Employer -> Processes
    cells.append(create_edge("df5", "e", "p3", style=lane_edge))
    cells.append(create_edge("df6", "e", "p6", style=lane_edge))
    
    # Individual -> Search
    cells.append(create_edge("df7", "i", "p5", style=lane_edge))
    
    # Process -> DB
    cells.append(create_edge("df8", "p1", "ds1", style=lane_edge))
    cells.append(create_edge("df9", "p2", "ds1", style=lane_edge))
    cells.append(create_edge("df10", "p3", "ds2", style=lane_edge))
    cells.append(create_edge("df11", "p4", "ds3", style=lane_edge))
    cells.append(create_edge("df12", "p4", "ds4", style=lane_edge))
    cells.append(create_edge("df13", "p5", "ds1", style=lane_edge))
    cells.append(create_edge("df14", "p6", "ds5", style=lane_edge))
    
    # DB -> Process
    cells.append(create_edge("df15", "ds2", "p4", style=lane_edge))
    
    # Admin -> Process
    cells.append(create_edge("df16", "a", "p7", style=lane_edge))
    cells.append(create_edge("df17", "p7", "ds1", style=lane_edge))
    cells.append(create_edge("df18", "p7", "ds4", style=lane_edge))

    # --- Foreground Shapes (Second) ---
    # Processes (Standard Grid)
    # P1: 50-140 (mid 95)
    # P2: 170-260 (mid 215)
    # P3: 290-380 (mid 335)
    # P4: 410-500 (mid 455)
    # P5: 530-620 (mid 575)
    proc_style = "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;opaque=1;strokeWidth=2;fontStyle=1;backgroundOutline=1;"
    cells.append(create_rect("p1", "1.0\\nAUTHENTICATION", 250, 50, 140, 90, style=proc_style))
    cells.append(create_rect("p2", "2.0\\nPROFILE MGMT", 250, 170, 140, 90, style=proc_style))
    cells.append(create_rect("p3", "3.0\\nJOB POSTINGS", 250, 290, 140, 90, style=proc_style))
    cells.append(create_rect("p4", "4.0\\nAI MATCHING", 250, 410, 140, 90, style=proc_style))
    cells.append(create_rect("p5", "5.0\\nDIAGNOSTIC", 250, 530, 140, 90, style=proc_style))
    
    cells.append(create_rect("p6", "6.0\\nMESSAGING", 500, 530, 140, 90, style=proc_style))
    cells.append(create_rect("p7", "7.0\\nTELEMETRY", 700, 290, 140, 90, style=proc_style))
    
    # Entities (In the GAPS between processes)
    # Gap 1 (between p1/p2): 140-170 -> center 155
    cells.append(create_rect("j", "JOBSEEKER", 50, 125, 120, 60))
    # Gap 2 (between p2/p3): 260-290 -> center 275
    cells.append(create_rect("e", "EMPLOYER", 50, 245, 120, 60))
    # Gap 3 (between p3/p4): 380-410 -> center 395
    cells.append(create_rect("i", "INDIVIDUAL", 50, 365, 120, 60))
    # Gap 4 (between p4/p5): 500-530 -> center 515
    cells.append(create_rect("a", "ADMINISTRATOR", 850, 515, 140, 60))
    
    # Data Stores (In the gaps on the right)
    ds_style = "shape=partialRectangle;right=0;left=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;opaque=1;strokeWidth=2;fontStyle=1;backgroundOutline=1;"
    cells.append(create_rect("ds1", "D1: USERS DB", 500, 140, 140, 40, style=ds_style)) # Gap 1
    cells.append(create_rect("ds2", "D2: JOBS DB", 500, 260, 140, 40, style=ds_style)) # Gap 2
    cells.append(create_rect("ds3", "D3: CACHE DB", 500, 380, 140, 40, style=ds_style)) # Gap 3
    cells.append(create_rect("ds4", "D4: ANALYTICS", 850, 140, 140, 40, style=ds_style))
    cells.append(create_rect("ds5", "D5: CHAT DB", 700, 480, 140, 40, style=ds_style))
    
    return create_drawio_xml("\n".join(cells))



def generate_erd():
    cells = []
    # --- Background Edges (First) ---
    # Screenshot style: startArrow=plus, endArrow=classic, 1:1 label
    rel_style = "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;fontColor=#000000;startArrow=plus;startFill=0;endArrow=classic;endFill=1;strokeWidth=1;"
    
    # User -> Profiles (Center hierarchical layout)
    cells.append(create_edge("er1", "t_users", "t_jp", "1:1", rel_style))
    cells.append(create_edge("er2", "t_users", "t_ep", "1:1", rel_style))
    cells.append(create_edge("er3", "t_users", "t_ip", "1:1", rel_style))
    
    # Secondary relationships (more subtle)
    sec_style = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#666666;fontColor=#000000;startArrow=none;endArrow=classic;endFill=1;strokeWidth=1;dashed=1;"
    cells.append(create_edge("er4", "t_ep", "t_jobs", "1:N", sec_style))
    cells.append(create_edge("er5", "t_jobs", "t_embed", "1:1", sec_style))
    cells.append(create_edge("er6", "t_jobs", "t_cache", "1:N", sec_style))
    cells.append(create_edge("er7", "t_jp", "t_cache", "1:N", sec_style))
    cells.append(create_edge("er8", "t_jobs", "t_app", "1:N", sec_style))
    cells.append(create_edge("er9", "t_jp", "t_app", "1:N", sec_style))

    # --- Foreground Tables (Second) ---
    # Top Row (Main Entity)
    cells.append(create_erd_table("t_users", "users", 
        ["UUID | id (PK)", "string | email (UK)", "string | role", "boolean | is_verified"], 
        400, 50, 200))

    # Middle Row (Profiles)
    cells.append(create_erd_table("t_jp", "jobseeker_profiles", 
        ["UUID | id (PK, FK)", "string | full_name", "string[] | skills", "string | resume_url"], 
        100, 300, 200))
    
    cells.append(create_erd_table("t_ep", "employer_profiles", 
        ["UUID | id (PK, FK)", "string | company_name", "string | business_reg_number", "string | gov_id_url"], 
        400, 300, 200))
    
    cells.append(create_erd_table("t_ip", "individual_profiles", 
        ["UUID | id (PK, FK)", "string | full_name", "string[] | service_preferences"], 
        700, 300, 200))

    # Bottom Rows (Supporting entities - moved further down to keep top clean)
    cells.append(create_erd_table("t_jobs", "job_postings", 
        ["UUID | id (PK)", "UUID | employer_id (FK)", "string | title", "string[] | req_skills"], 
        400, 550, 200))
    
    cells.append(create_erd_table("t_embed", "req_embeddings", 
        ["UUID | job_id (PK, FK)", "vector | embedding", "string | version"], 
        100, 550, 200))
    
    cells.append(create_erd_table("t_app", "applications", 
        ["UUID | id (PK)", "UUID | job_id (FK)", "UUID | jobseeker_id (FK)", "int | match_score"], 
        700, 550, 200))
    
    cells.append(create_erd_table("t_cache", "match_cache", 
        ["UUID | id (PK)", "UUID | job_id (FK)", "UUID | jobseeker_id (FK)", "int | score", "jsonb | breakdown"], 
        950, 300, 220))

    return create_drawio_xml("\n".join(cells))



def generate_use_case_diagram():
    cells = []
    # --- Background Edges (First) ---
    edge_style = "edgeStyle=none;html=1;endArrow=none;strokeColor=#000000;jumpStyle=arc;strokeWidth=1.2;"
    cells.append(create_edge("eu1", "a_js", "uc1", "", edge_style))
    cells.append(create_edge("eu2", "a_js", "uc2", "", edge_style))
    cells.append(create_edge("eu3", "a_js", "uc3", "", edge_style))
    cells.append(create_edge("eu4", "a_js", "uc7", "", edge_style))
    cells.append(create_edge("eu5", "a_emp", "uc1", "", edge_style))
    cells.append(create_edge("eu6", "a_emp", "uc4", "", edge_style))
    cells.append(create_edge("eu7", "a_emp", "uc5", "", edge_style))
    cells.append(create_edge("eu8", "a_emp", "uc7", "", edge_style))
    cells.append(create_edge("eu9", "a_ind", "uc1", "", edge_style))
    cells.append(create_edge("eu10", "a_ind", "uc6", "", edge_style))
    cells.append(create_edge("eu11", "a_ind", "uc7", "", edge_style))
    cells.append(create_edge("eu12", "a_adm", "uc8", "", edge_style))
    cells.append(create_edge("eu13", "a_adm", "uc9", "", edge_style))

    # --- Foreground Shapes (Second) ---
    # Actors
    act_style = "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;opaque=1;strokeWidth=2;shadow=1;"
    cells.append(create_rect("a_js", "JOBSEEKER", 50, 150, 40, 80, act_style))
    cells.append(create_rect("a_emp", "EMPLOYER", 50, 350, 40, 80, act_style))
    cells.append(create_rect("a_ind", "INDIVIDUAL", 50, 550, 40, 80, act_style))
    cells.append(create_rect("a_adm", "PESO ADMIN", 750, 350, 40, 80, act_style))

    # System Boundary (Made transparent by removing swimlaneFillColor and fillColor)
    boundary_style = "swimlane;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#000000;fontColor=#000000;startSize=30;opaque=1;strokeWidth=2;shadow=0;fontStyle=1;"
    cells.append(create_rect("sys_bound", "PESO-CONNECT PLATFORM", 200, 50, 500, 750, style=boundary_style))

    # Use Cases (Solid white ellipses with shadows)
    uc_style = "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;opaque=1;strokeWidth=2;shadow=1;fontStyle=1;"
    cells.append(create_rect("uc1", "REGISTER ACCOUNT", 250, 100, 140, 60, uc_style))
    cells.append(create_rect("uc2", "BROWSE JOBS &amp; SCORES", 250, 190, 160, 60, uc_style))
    cells.append(create_rect("uc3", "APPLY FOR JOBS", 250, 280, 140, 60, uc_style))
    cells.append(create_rect("uc4", "POST JOBS (AI RECS)", 250, 370, 160, 60, uc_style))
    cells.append(create_rect("uc5", "REVIEW APPLICANTS", 250, 460, 140, 60, uc_style))
    cells.append(create_rect("uc6", "DIAGNOSTIC SEARCH", 250, 550, 140, 60, uc_style))
    cells.append(create_rect("uc7", "REAL-TIME MESSAGING", 250, 640, 160, 60, uc_style))
    
    # Admin Cases
    cells.append(create_rect("uc8", "VERIFY USERS", 500, 300, 140, 60, uc_style))
    cells.append(create_rect("uc9", "VIEW ANALYTICS", 500, 400, 140, 60, uc_style))
    
    return create_drawio_xml("\n".join(cells))


def main():
    os.makedirs("docs/diagrams", exist_ok=True)
    with open("docs/diagrams/application_flowchart.drawio", "w", encoding="utf-8") as f:
        f.write(generate_flowchart())
    with open("docs/diagrams/system_architecture.drawio", "w", encoding="utf-8") as f:
        f.write(generate_system_architecture())
    with open("docs/diagrams/context_diagram.drawio", "w", encoding="utf-8") as f:
        f.write(generate_context_diagram())
    with open("docs/diagrams/dfd_level_1.drawio", "w", encoding="utf-8") as f:
        f.write(generate_dfd_level_1())
    with open("docs/diagrams/erd.drawio", "w", encoding="utf-8") as f:
        f.write(generate_erd())
    with open("docs/diagrams/use_case_diagram.drawio", "w", encoding="utf-8") as f:
        f.write(generate_use_case_diagram())

if __name__ == "__main__":
    main()
