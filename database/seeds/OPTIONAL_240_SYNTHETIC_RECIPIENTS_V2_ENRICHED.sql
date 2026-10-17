-- OPTIONAL. This is a SYNTHETIC-only 240-row fixture for isolated bcs-dev testing.
-- Original Windows-1252 TAB-delimited CSV SHA-256: d4938008f983a48387f4fc2519bbb331eea734d677121e882c2230e59eef557e
-- This reviewed output was converted to UTF-8 literals without changing source bytes.
-- DO NOT RUN against SoftVAT CRM, another company or a populated production dataset.
-- Requires migration 009 (two optional geography columns) in addition to 001..008.
-- 11 synthetic demographic/contact/location fields are filled deterministically from target_id.
-- No use of SQL random(); repeated imports produce identical output.
-- Phone values deliberately start with a non-dialable 00 national prefix. NEVER use for SMS/WhatsApp.
-- Real city/district names and sample GPO PINs are geography test fixtures, not actual addresses.
-- Runs only after migrations 001..009, uses an admin SQL Editor identity with BYPASSRLS.
-- Company code and portal code are reserved for synthetic test-only use.
-- Safe to repeat: existing identical records remain unchanged; conflicts abort atomically.
-- NO send identities, SES calls, queues, campaigns or assumed marketing consent are created.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=9) THEN
   RAISE EXCEPTION 'Run reviewed BCS migrations 001..009 first'; END IF;
 IF NOT COALESCE((SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user), false) THEN
   RAISE EXCEPTION 'Demo seed requires approved admin SQL Editor role with BYPASSRLS'; END IF;
END $guard$;

CREATE TEMP TABLE bcs_demo_input (
  target_id text, name text, email text, recipient_group text, category text, grade text, dob text, gender text, mobile_no text, whatsapp_no text, address_1 text, address_2 text, city text, pin text, st_id text, dt_id text, status text
) ON COMMIT DROP;

INSERT INTO pg_temp.bcs_demo_input (target_id, name, email, recipient_group, category, grade, dob, gender, mobile_no, whatsapp_no, address_1, address_2, city, pin, st_id, dt_id, status) VALUES
  ('STD-1207', 'Aarav Desai', 'aarav.desai207@example.com', 'Design & UX', 'Figma · Evening', 'Premium', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1153', 'Aarav Gowda', 'aarav.gowda153@example.com', 'Digital Marketing', 'Performance Ads · Batch B', 'Free', '', '', '', '', '', '', '', '', '', '', 'Inactive'),
  ('STD-1045', 'Aarav Gupta', 'aarav.gupta45@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', 'Donation', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1136', 'Aarav Gupta', 'aarav.gupta136@example.com', 'Digital Marketing', 'SEO · Batch A', 'GRADE A Employee', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1072', 'Aarav Jain', 'aarav.jain72@example.com', 'Data Science & AI', 'Python · Morning', 'GRADE B Employee', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1163', 'Aarav Jain', 'aarav.jain163@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1055', 'Aarav Joshi', 'aarav.joshi55@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1180', 'Aarav Kulkarni', 'aarav.kulkarni180@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1082', 'Aarav Menon', 'aarav.menon82@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1126', 'Aarav Patel', 'aarav.patel126@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1217', 'Aarav Patel', 'aarav.patel217@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1234', 'Aarav Prasad', 'aarav.prasad234@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1001', 'Aarav Rao', 'aarav.rao1@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Bounced'),
  ('STD-1018', 'Aarav Reddy', 'aarav.reddy18@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1109', 'Aarav Reddy', 'aarav.reddy109@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1099', 'Aarav Sharma', 'aarav.sharma99@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1190', 'Aarav Sharma', 'aarav.sharma190@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1028', 'Aarav Shetty', 'aarav.shetty28@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1220', 'Aditi Desai', 'aditi.desai220@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1166', 'Aditi Gowda', 'aditi.gowda166@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1058', 'Aditi Gupta', 'aditi.gupta58@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Inactive'),
  ('STD-1085', 'Aditi Jain', 'aditi.jain85@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1193', 'Aditi Kulkarni', 'aditi.kulkarni193@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1004', 'Aditi Menon', 'aditi.menon4@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1139', 'Aditi Patel', 'aditi.patel139@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1031', 'Aditi Reddy', 'aditi.reddy31@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1112', 'Aditi Sharma', 'aditi.sharma112@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Bounced'),
  ('STD-1194', 'Aditya Desai', 'aditya.desai194@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1140', 'Aditya Gowda', 'aditya.gowda140@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1032', 'Aditya Gupta', 'aditya.gupta32@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1059', 'Aditya Jain', 'aditya.jain59@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Unsubscribed'),
  ('STD-1167', 'Aditya Kulkarni', 'aditya.kulkarni167@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1113', 'Aditya Patel', 'aditya.patel113@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1221', 'Aditya Prasad', 'aditya.prasad221@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1005', 'Aditya Reddy', 'aditya.reddy5@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1086', 'Aditya Sharma', 'aditya.sharma86@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1116', 'Ananya Desai', 'ananya.desai116@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1062', 'Ananya Gowda', 'ananya.gowda62@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1224', 'Ananya Joshi', 'ananya.joshi224@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1089', 'Ananya Kulkarni', 'ananya.kulkarni89@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1035', 'Ananya Patel', 'ananya.patel35@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1143', 'Ananya Prasad', 'ananya.prasad143@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1170', 'Ananya Rao', 'ananya.rao170@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1008', 'Ananya Sharma', 'ananya.sharma8@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1197', 'Ananya Shetty', 'ananya.shetty197@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1090', 'Arjun Desai', 'arjun.desai90@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1181', 'Arjun Desai', 'arjun.desai181@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1036', 'Arjun Gowda', 'arjun.gowda36@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1127', 'Arjun Gowda', 'arjun.gowda127@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1019', 'Arjun Gupta', 'arjun.gupta19@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1046', 'Arjun Jain', 'arjun.jain46@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1198', 'Arjun Joshi', 'arjun.joshi198@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1063', 'Arjun Kulkarni', 'arjun.kulkarni63@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1154', 'Arjun Kulkarni', 'arjun.kulkarni154@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1225', 'Arjun Menon', 'arjun.menon225@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1009', 'Arjun Patel', 'arjun.patel9@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1100', 'Arjun Patel', 'arjun.patel100@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1117', 'Arjun Prasad', 'arjun.prasad117@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Unsubscribed'),
  ('STD-1208', 'Arjun Prasad', 'arjun.prasad208@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1144', 'Arjun Rao', 'arjun.rao144@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1235', 'Arjun Rao', 'arjun.rao235@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1073', 'Arjun Sharma', 'arjun.sharma73@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1171', 'Arjun Shetty', 'arjun.shetty171@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1233', 'Diya Desai', 'diya.desai233@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Unsubscribed'),
  ('STD-1179', 'Diya Gowda', 'diya.gowda179@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1071', 'Diya Gupta', 'diya.gupta71@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1098', 'Diya Jain', 'diya.jain98@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1206', 'Diya Kulkarni', 'diya.kulkarni206@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1017', 'Diya Menon', 'diya.menon17@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1152', 'Diya Patel', 'diya.patel152@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1044', 'Diya Reddy', 'diya.reddy44@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1125', 'Diya Sharma', 'diya.sharma125@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1231', 'Ishita Gowda', 'ishita.gowda231@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1123', 'Ishita Gupta', 'ishita.gupta123@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1150', 'Ishita Jain', 'ishita.jain150@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1042', 'Ishita Joshi', 'ishita.joshi42@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1069', 'Ishita Menon', 'ishita.menon69@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1204', 'Ishita Patel', 'ishita.patel204@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Unsubscribed'),
  ('STD-1096', 'Ishita Reddy', 'ishita.reddy96@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Inactive'),
  ('STD-1177', 'Ishita Sharma', 'ishita.sharma177@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1015', 'Ishita Shetty', 'ishita.shetty15@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1218', 'Kavya Gowda', 'kavya.gowda218@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1110', 'Kavya Gupta', 'kavya.gupta110@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1137', 'Kavya Jain', 'kavya.jain137@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1029', 'Kavya Joshi', 'kavya.joshi29@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1056', 'Kavya Menon', 'kavya.menon56@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1191', 'Kavya Patel', 'kavya.patel191@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Inactive'),
  ('STD-1083', 'Kavya Reddy', 'kavya.reddy83@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1164', 'Kavya Sharma', 'kavya.sharma164@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1002', 'Kavya Shetty', 'kavya.shetty2@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1205', 'Kiran Gowda', 'kiran.gowda205@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1097', 'Kiran Gupta', 'kiran.gupta97@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1124', 'Kiran Jain', 'kiran.jain124@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1016', 'Kiran Joshi', 'kiran.joshi16@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1232', 'Kiran Kulkarni', 'kiran.kulkarni232@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1043', 'Kiran Menon', 'kiran.menon43@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1178', 'Kiran Patel', 'kiran.patel178@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1070', 'Kiran Reddy', 'kiran.reddy70@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1151', 'Kiran Sharma', 'kiran.sharma151@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1142', 'Manish Desai', 'manish.desai142@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1088', 'Manish Gowda', 'manish.gowda88@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Unsubscribed'),
  ('STD-1007', 'Manish Jain', 'manish.jain7@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1115', 'Manish Kulkarni', 'manish.kulkarni115@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Inactive'),
  ('STD-1061', 'Manish Patel', 'manish.patel61@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1169', 'Manish Prasad', 'manish.prasad169@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1196', 'Manish Rao', 'manish.rao196@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1034', 'Manish Sharma', 'manish.sharma34@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1223', 'Manish Shetty', 'manish.shetty223@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Bounced'),
  ('STD-1103', 'Meera Desai', 'meera.desai103@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1049', 'Meera Gowda', 'meera.gowda49@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1211', 'Meera Joshi', 'meera.joshi211@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1076', 'Meera Kulkarni', 'meera.kulkarni76@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1238', 'Meera Menon', 'meera.menon238@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1022', 'Meera Patel', 'meera.patel22@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1130', 'Meera Prasad', 'meera.prasad130@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1157', 'Meera Rao', 'meera.rao157@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1184', 'Meera Shetty', 'meera.shetty184@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1149', 'Naveen Gupta', 'naveen.gupta149@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Bounced'),
  ('STD-1176', 'Naveen Jain', 'naveen.jain176@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1068', 'Naveen Joshi', 'naveen.joshi68@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1095', 'Naveen Menon', 'naveen.menon95@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1230', 'Naveen Patel', 'naveen.patel230@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1014', 'Naveen Rao', 'naveen.rao14@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1122', 'Naveen Reddy', 'naveen.reddy122@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1203', 'Naveen Sharma', 'naveen.sharma203@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1041', 'Naveen Shetty', 'naveen.shetty41@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1168', 'Neha Desai', 'neha.desai168@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1114', 'Neha Gowda', 'neha.gowda114@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1006', 'Neha Gupta', 'neha.gupta6@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1033', 'Neha Jain', 'neha.jain33@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1141', 'Neha Kulkarni', 'neha.kulkarni141@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1087', 'Neha Patel', 'neha.patel87@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1195', 'Neha Prasad', 'neha.prasad195@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1222', 'Neha Rao', 'neha.rao222@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1060', 'Neha Sharma', 'neha.sharma60@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1188', 'Nisha Gupta', 'nisha.gupta188@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1215', 'Nisha Jain', 'nisha.jain215@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1107', 'Nisha Joshi', 'nisha.joshi107@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1134', 'Nisha Menon', 'nisha.menon134@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Inactive'),
  ('STD-1026', 'Nisha Prasad', 'nisha.prasad26@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1053', 'Nisha Rao', 'nisha.rao53@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1161', 'Nisha Reddy', 'nisha.reddy161@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1080', 'Nisha Shetty', 'nisha.shetty80@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1155', 'Pooja Desai', 'pooja.desai155@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1101', 'Pooja Gowda', 'pooja.gowda101@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1020', 'Pooja Jain', 'pooja.jain20@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Inactive'),
  ('STD-1128', 'Pooja Kulkarni', 'pooja.kulkarni128@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1074', 'Pooja Patel', 'pooja.patel74@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1182', 'Pooja Prasad', 'pooja.prasad182@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1209', 'Pooja Rao', 'pooja.rao209@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1047', 'Pooja Sharma', 'pooja.sharma47@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1236', 'Pooja Shetty', 'pooja.shetty236@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1129', 'Pranav Desai', 'pranav.desai129@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1075', 'Pranav Gowda', 'pranav.gowda75@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Bounced'),
  ('STD-1237', 'Pranav Joshi', 'pranav.joshi237@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1102', 'Pranav Kulkarni', 'pranav.kulkarni102@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1048', 'Pranav Patel', 'pranav.patel48@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1156', 'Pranav Prasad', 'pranav.prasad156@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1183', 'Pranav Rao', 'pranav.rao183@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1021', 'Pranav Sharma', 'pranav.sharma21@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1210', 'Pranav Shetty', 'pranav.shetty210@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Inactive'),
  ('STD-1077', 'Rahul Desai', 'rahul.desai77@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Inactive'),
  ('STD-1023', 'Rahul Gowda', 'rahul.gowda23@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1185', 'Rahul Joshi', 'rahul.joshi185@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1050', 'Rahul Kulkarni', 'rahul.kulkarni50@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1212', 'Rahul Menon', 'rahul.menon212@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1104', 'Rahul Prasad', 'rahul.prasad104@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1131', 'Rahul Rao', 'rahul.rao131@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1239', 'Rahul Reddy', 'rahul.reddy239@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1158', 'Rahul Shetty', 'rahul.shetty158@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1012', 'Rohan Desai', 'rohan.desai12@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1201', 'Rohan Gupta', 'rohan.gupta201@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1228', 'Rohan Jain', 'rohan.jain228@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1120', 'Rohan Joshi', 'rohan.joshi120@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1147', 'Rohan Menon', 'rohan.menon147@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1039', 'Rohan Prasad', 'rohan.prasad39@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Inactive'),
  ('STD-1066', 'Rohan Rao', 'rohan.rao66@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1174', 'Rohan Reddy', 'rohan.reddy174@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1093', 'Rohan Shetty', 'rohan.shetty93@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1175', 'Sahana Gupta', 'sahana.gupta175@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Unsubscribed'),
  ('STD-1202', 'Sahana Jain', 'sahana.jain202@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1094', 'Sahana Joshi', 'sahana.joshi94@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1121', 'Sahana Menon', 'sahana.menon121@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1013', 'Sahana Prasad', 'sahana.prasad13@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1040', 'Sahana Rao', 'sahana.rao40@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1148', 'Sahana Reddy', 'sahana.reddy148@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1229', 'Sahana Sharma', 'sahana.sharma229@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Inactive'),
  ('STD-1067', 'Sahana Shetty', 'sahana.shetty67@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1051', 'Sanjana Desai', 'sanjana.desai51@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1240', 'Sanjana Gupta', 'sanjana.gupta240@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1159', 'Sanjana Joshi', 'sanjana.joshi159@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1024', 'Sanjana Kulkarni', 'sanjana.kulkarni24@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1186', 'Sanjana Menon', 'sanjana.menon186@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Bounced'),
  ('STD-1078', 'Sanjana Prasad', 'sanjana.prasad78@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1105', 'Sanjana Rao', 'sanjana.rao105@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1213', 'Sanjana Reddy', 'sanjana.reddy213@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1132', 'Sanjana Shetty', 'sanjana.shetty132@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1038', 'Swathi Desai', 'swathi.desai38@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Bounced'),
  ('STD-1227', 'Swathi Gupta', 'swathi.gupta227@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1146', 'Swathi Joshi', 'swathi.joshi146@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Unsubscribed'),
  ('STD-1011', 'Swathi Kulkarni', 'swathi.kulkarni11@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1173', 'Swathi Menon', 'swathi.menon173@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1065', 'Swathi Prasad', 'swathi.prasad65@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1092', 'Swathi Rao', 'swathi.rao92@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1200', 'Swathi Reddy', 'swathi.reddy200@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1119', 'Swathi Shetty', 'swathi.shetty119@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1025', 'Vihaan Desai', 'vihaan.desai25@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1214', 'Vihaan Gupta', 'vihaan.gupta214@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1133', 'Vihaan Joshi', 'vihaan.joshi133@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1160', 'Vihaan Menon', 'vihaan.menon160@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1052', 'Vihaan Prasad', 'vihaan.prasad52@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1079', 'Vihaan Rao', 'vihaan.rao79@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1187', 'Vihaan Reddy', 'vihaan.reddy187@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1106', 'Vihaan Shetty', 'vihaan.shetty106@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1192', 'Vikram Gowda', 'vikram.gowda192@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1084', 'Vikram Gupta', 'vikram.gupta84@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1111', 'Vikram Jain', 'vikram.jain111@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1003', 'Vikram Joshi', 'vikram.joshi3@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1219', 'Vikram Kulkarni', 'vikram.kulkarni219@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1030', 'Vikram Menon', 'vikram.menon30@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Unsubscribed'),
  ('STD-1165', 'Vikram Patel', 'vikram.patel165@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1057', 'Vikram Reddy', 'vikram.reddy57@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1138', 'Vikram Sharma', 'vikram.sharma138@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1064', 'Yash Desai', 'yash.desai64@example.com', 'Data Science & AI', 'Python · Morning', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1010', 'Yash Gowda', 'yash.gowda10@example.com', 'Full Stack Development', 'React JS · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1162', 'Yash Gupta', 'yash.gupta162@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1189', 'Yash Jain', 'yash.jain189@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1081', 'Yash Joshi', 'yash.joshi81@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1172', 'Yash Joshi', 'yash.joshi172@example.com', 'Digital Marketing', 'Analytics · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Inactive'),
  ('STD-1037', 'Yash Kulkarni', 'yash.kulkarni37@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1108', 'Yash Menon', 'yash.menon108@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1199', 'Yash Menon', 'yash.menon199@example.com', 'Design & UX', 'UI Fundamentals · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1091', 'Yash Prasad', 'yash.prasad91@example.com', 'Data Science & AI', 'Machine Learning · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1027', 'Yash Rao', 'yash.rao27@example.com', 'Full Stack Development', 'Node.js · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1118', 'Yash Rao', 'yash.rao118@example.com', 'Data Science & AI', 'GenAI · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1135', 'Yash Reddy', 'yash.reddy135@example.com', 'Digital Marketing', 'SEO · Batch A', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1226', 'Yash Reddy', 'yash.reddy226@example.com', 'Design & UX', 'Product Design · Weekend', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1216', 'Yash Sharma', 'yash.sharma216@example.com', 'Design & UX', 'Figma · Evening', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1054', 'Yash Shetty', 'yash.shetty54@example.com', 'Full Stack Development', 'Java Full Stack · Batch C', '', '', '', '', '', '', '', '', '', '', '', 'Active'),
  ('STD-1145', 'Yash Shetty', 'yash.shetty145@example.com', 'Digital Marketing', 'Performance Ads · Batch B', '', '', '', '', '', '', '', '', '', '', '', 'Active');


-- Add temporary geography fields; original CSV's 17-column source rows remain unchanged.
ALTER TABLE pg_temp.bcs_demo_input
  ADD COLUMN state_name text,
  ADD COLUMN district_name text;

-- Populate intentionally fictional contact/demographic data for UI and API testing.
-- Geographic labels/PINs are coherent examples, not real residence declarations.
-- Pseudo-random-looking values are deterministic from STD-1001..STD-1240 IDs.
WITH geo(city_index, city_name, district, state, pin_code) AS (
  VALUES
    (0,  'Bengaluru',  'Bengaluru Urban', 'Karnataka',     '560001'),
    (1,  'Mysuru',     'Mysuru',          'Karnataka',     '570001'),
    (2,  'Mandya',     'Mandya',          'Karnataka',     '571401'),
    (3,  'Mangaluru',  'Dakshina Kannada','Karnataka',    '575001'),
    (4,  'Hyderabad',  'Hyderabad',       'Telangana',     '500001'),
    (5,  'Chennai',    'Chennai',         'Tamil Nadu',    '600001'),
    (6,  'Kochi',      'Ernakulam',       'Kerala',        '682001'),
    (7,  'Pune',       'Pune',            'Maharashtra',   '411001'),
    (8,  'New Delhi',  'New Delhi',       'Delhi',         '110001'),
    (9,  'Kolkata',    'Kolkata',         'West Bengal',   '700001'),
    (10, 'Ahmedabad',  'Ahmedabad',       'Gujarat',       '380001'),
    (11, 'Jaipur',     'Jaipur',          'Rajasthan',     '302001')
)
UPDATE pg_temp.bcs_demo_input AS r
SET
  grade = coalesce(nullif(r.grade, ''), CASE (right(r.target_id, 4)::integer * 11 + 7) % 6
    WHEN 0 THEN 'Free' WHEN 1 THEN 'Premium' WHEN 2 THEN 'Donation'
    WHEN 3 THEN 'Regular' WHEN 4 THEN 'GRADE A Employee' ELSE 'GRADE B Employee' END),
  dob = coalesce(nullif(r.dob, ''), to_char(make_date(
    1985 + ((right(r.target_id, 4)::integer * 13) % 20),
    1 + ((right(r.target_id, 4)::integer * 7) % 12),
    1 + ((right(r.target_id, 4)::integer * 11) % 28)
  ), 'YYYY-MM-DD')),
  gender = coalesce(nullif(r.gender, ''), CASE (right(r.target_id, 4)::integer * 17 + 3) % 5
    WHEN 0 THEN 'Female' WHEN 1 THEN 'Male' WHEN 2 THEN 'Female'
    WHEN 3 THEN 'Male' ELSE 'Prefer not to say' END),
  mobile_no = coalesce(nullif(r.mobile_no, ''), '+91' || lpad(((right(r.target_id, 4)::integer * 37 + 11) % 1000000)::text, 10, '0')),
  whatsapp_no = coalesce(nullif(r.whatsapp_no, ''), '+91' || lpad(((right(r.target_id, 4)::integer * 73 + 19) % 1000000)::text, 10, '0')),
  address_1 = coalesce(nullif(r.address_1, ''), 'Synthetic House ' || ((right(r.target_id,4)::integer * 19) % 350 + 1)::text
    || ', Test Street ' || ((right(r.target_id,4)::integer * 7) % 24 + 1)::text),
  address_2 = coalesce(nullif(r.address_2, ''), 'Example Layout, Sample Block '
    || chr(65 + ((right(r.target_id,4)::integer * 3) % 7))),
  city = coalesce(nullif(r.city, ''), geo.city_name),
  pin = coalesce(nullif(r.pin, ''), geo.pin_code),
  state_name = geo.state,
  district_name = geo.district
FROM geo
WHERE geo.city_index = ((right(r.target_id, 4)::integer * 17 + 3) % 12);

-- Verify enrichment before touching durable BCS data.
DO $data_quality$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM pg_temp.bcs_demo_input;
  IF n <> 240 THEN RAISE EXCEPTION 'Expected 240 fixture rows, found %', n; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_temp.bcs_demo_input
    WHERE grade IS NULL OR grade = '' OR dob IS NULL OR dob = ''
      OR gender IS NULL OR gender = ''
      OR mobile_no !~ '^\+[1-9][0-9]{7,14}$'
      OR whatsapp_no !~ '^\+[1-9][0-9]{7,14}$'
      OR address_1 IS NULL OR address_2 IS NULL OR city IS NULL
      OR pin !~ '^[0-9]{6}$' OR state_name IS NULL OR district_name IS NULL
  ) THEN
    RAISE EXCEPTION 'Synthetic enrichment contains missing or invalid values';
  END IF;
END $data_quality$;

DO $check$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM pg_temp.bcs_demo_input;
 IF n <> 240 THEN RAISE EXCEPTION 'Expected 240 synthetic records, got %',n; END IF;
 IF EXISTS (SELECT target_id FROM pg_temp.bcs_demo_input GROUP BY target_id HAVING count(*) > 1) THEN
   RAISE EXCEPTION 'Duplicate target_id in synthetic source'; END IF;
 IF EXISTS (SELECT lower(email) FROM pg_temp.bcs_demo_input GROUP BY lower(email) HAVING count(*) > 1) THEN
   RAISE EXCEPTION 'Duplicate sample email in synthetic source'; END IF;
END $check$;

INSERT INTO bcs.companies(company_code,company_name,status,default_timezone)
VALUES ('softvat-bcs-demo','SoftVAT BCS synthetic demo','trial','Asia/Kolkata')
ON CONFLICT (company_code) DO NOTHING;
DO $check$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM bcs.companies WHERE company_code='softvat-bcs-demo'
    AND company_name='SoftVAT BCS synthetic demo' AND status='trial') THEN
   RAISE EXCEPTION 'Reserved synthetic company code already used differently'; END IF;
END $check$;

INSERT INTO bcs.portals(company_id,portal_code,portal_name,portal_kind,integration_mode,timezone,status)
SELECT id,'skillmonk-demo','SkillMonk Academy (synthetic)','education','bcs_native','Asia/Kolkata','draft'
FROM bcs.companies WHERE company_code='softvat-bcs-demo'
ON CONFLICT (company_id,portal_code) DO NOTHING;
DO $check$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM bcs.portals p JOIN bcs.companies c ON c.id=p.company_id
   WHERE c.company_code='softvat-bcs-demo' AND p.portal_code='skillmonk-demo'
   AND p.portal_name='SkillMonk Academy (synthetic)' AND p.integration_mode='bcs_native' AND p.status='draft') THEN
  RAISE EXCEPTION 'Reserved synthetic portal code already used differently'; END IF;
END $check$;

-- Use exact fixture values, but no hardcoded group/category restrictions in schema.
INSERT INTO bcs.audience_groups(company_id,portal_id,source_group_key,group_name)
SELECT c.id,p.id,s.recipient_group,s.recipient_group
FROM (SELECT DISTINCT recipient_group FROM pg_temp.bcs_demo_input) s
CROSS JOIN bcs.companies c JOIN bcs.portals p ON p.company_id=c.id
WHERE c.company_code='softvat-bcs-demo' AND p.portal_code='skillmonk-demo'
ON CONFLICT(company_id,portal_id,source_group_key) DO NOTHING;

INSERT INTO bcs.audience_subgroups(company_id,portal_id,group_id,source_subgroup_key,subgroup_name)
SELECT g.company_id,g.portal_id,g.id,s.category,s.category
FROM (SELECT DISTINCT recipient_group,category FROM pg_temp.bcs_demo_input) s
JOIN bcs.audience_groups g ON g.source_group_key=s.recipient_group
JOIN bcs.companies c ON c.id=g.company_id AND c.company_code='softvat-bcs-demo'
JOIN bcs.portals p ON p.company_id=c.id AND p.id=g.portal_id AND p.portal_code='skillmonk-demo'
ON CONFLICT(company_id,portal_id,group_id,source_subgroup_key) DO NOTHING;

-- Idempotent seed must not silently accept changed group/subgroup definitions.
DO $check$ BEGIN
  IF EXISTS (
    SELECT 1 FROM (SELECT DISTINCT recipient_group FROM pg_temp.bcs_demo_input) s
    CROSS JOIN bcs.companies c JOIN bcs.portals p ON p.company_id=c.id
    LEFT JOIN bcs.audience_groups g ON g.company_id=c.id AND g.portal_id=p.id
      AND g.source_group_key=s.recipient_group
    WHERE c.company_code='softvat-bcs-demo' AND p.portal_code='skillmonk-demo'
      AND (g.id IS NULL OR g.group_name IS DISTINCT FROM s.recipient_group)
  ) THEN RAISE EXCEPTION 'Synthetic group names/keys conflict with existing data'; END IF;
  IF EXISTS (
    SELECT 1 FROM (SELECT DISTINCT recipient_group,category FROM pg_temp.bcs_demo_input) s
    CROSS JOIN bcs.companies c JOIN bcs.portals p ON p.company_id=c.id
    LEFT JOIN bcs.audience_groups g ON g.company_id=c.id AND g.portal_id=p.id
      AND g.source_group_key=s.recipient_group
    LEFT JOIN bcs.audience_subgroups sg ON sg.company_id=c.id AND sg.portal_id=p.id
      AND sg.group_id=g.id AND sg.source_subgroup_key=s.category
    WHERE c.company_code='softvat-bcs-demo' AND p.portal_code='skillmonk-demo'
      AND (sg.id IS NULL OR sg.subgroup_name IS DISTINCT FROM s.category)
  ) THEN RAISE EXCEPTION 'Synthetic subgroup names/keys conflict with existing data'; END IF;
END $check$;

INSERT INTO bcs.recipients (company_id,portal_id,
 target_id,name,email,recipient_group,category,grade,dob,gender,mobile_no,whatsapp_no,
 address_1,address_2,city,pin,st_id,dt_id,status,state_name,district_name)
SELECT c.id,p.id,r.target_id,r.name,r.email,r.recipient_group,r.category,
 NULLIF(r.grade,''),NULLIF(r.dob,'')::date,NULLIF(r.gender,''),NULLIF(r.mobile_no,''),NULLIF(r.whatsapp_no,''),
 NULLIF(r.address_1,''),NULLIF(r.address_2,''),NULLIF(r.city,''),NULLIF(r.pin,''),NULLIF(r.st_id,''),NULLIF(r.dt_id,''),r.status,r.state_name,r.district_name
FROM pg_temp.bcs_demo_input r CROSS JOIN bcs.companies c
JOIN bcs.portals p ON p.company_id=c.id
WHERE c.company_code='softvat-bcs-demo' AND p.portal_code='skillmonk-demo'
ON CONFLICT(company_id,portal_id,target_id) DO NOTHING;

-- Detect any existing same-key row whose original 17 columns are different.
DO $check$ DECLARE mismatches integer; BEGIN
 SELECT count(*) INTO mismatches FROM pg_temp.bcs_demo_input s
 CROSS JOIN bcs.companies c JOIN bcs.portals p ON p.company_id=c.id
 LEFT JOIN bcs.recipients r ON r.company_id=c.id AND r.portal_id=p.id AND r.target_id=s.target_id
 WHERE c.company_code='softvat-bcs-demo' AND p.portal_code='skillmonk-demo'
 AND (r.id IS NULL OR ROW(r.name,r.email,r.recipient_group,r.category,r.grade,r.dob,r.gender,
 r.mobile_no,r.whatsapp_no,r.address_1,r.address_2,r.city,r.pin,r.st_id,r.dt_id,r.status,r.state_name,r.district_name)
 IS DISTINCT FROM ROW(s.name,s.email,s.recipient_group,s.category,NULLIF(s.grade,''),NULLIF(s.dob,'')::date,
 NULLIF(s.gender,''),NULLIF(s.mobile_no,''),NULLIF(s.whatsapp_no,''),NULLIF(s.address_1,''),
 NULLIF(s.address_2,''),NULLIF(s.city,''),NULLIF(s.pin,''),NULLIF(s.st_id,''),NULLIF(s.dt_id,''),s.status,s.state_name,s.district_name));
 IF mismatches <> 0 THEN RAISE EXCEPTION 'Conflicting synthetic rows: %; no existing record was overwritten',mismatches; END IF;
END $check$;

INSERT INTO bcs.recipient_group_memberships(company_id,portal_id,recipient_id,group_id,subgroup_id)
SELECT r.company_id,r.portal_id,r.id,g.id,sg.id
FROM bcs.recipients r
JOIN bcs.audience_groups g ON g.company_id=r.company_id AND g.portal_id=r.portal_id
 AND g.source_group_key=r.recipient_group
JOIN bcs.audience_subgroups sg ON sg.company_id=r.company_id AND sg.portal_id=r.portal_id
 AND sg.group_id=g.id AND sg.source_subgroup_key=r.category
JOIN bcs.companies c ON c.id=r.company_id AND c.company_code='softvat-bcs-demo'
JOIN bcs.portals p ON p.company_id=r.company_id AND p.id=r.portal_id AND p.portal_code='skillmonk-demo'
ON CONFLICT(company_id,portal_id,recipient_id,group_id,subgroup_id) DO NOTHING;

-- Synthetic suppression examples only, derived from fictional source statuses.
INSERT INTO bcs.email_suppressions(company_id,email_normalized,reason,source_reference)
SELECT c.id,lower(btrim(s.email)),CASE s.status WHEN 'Bounced' THEN 'hard_bounce' ELSE 'unsubscribe' END,'synthetic_fixture'
FROM pg_temp.bcs_demo_input s CROSS JOIN bcs.companies c
WHERE c.company_code='softvat-bcs-demo' AND s.status IN ('Bounced','Unsubscribed')
ON CONFLICT(company_id,email_normalized,reason) DO NOTHING;

-- Assert expected counts for THIS portal, even after a repeat execution.
DO $check$
DECLARE n integer; active_n integer; bounced_n integer; optout_n integer; inactive_n integer; group_n integer; sub_n integer; membership_n integer;
BEGIN
 SELECT count(*),count(*) FILTER(WHERE r.status='Active'),
 count(*) FILTER(WHERE r.status='Bounced'),count(*) FILTER(WHERE r.status='Unsubscribed'),
 count(*) FILTER(WHERE r.status='Inactive')
 INTO n,active_n,bounced_n,optout_n,inactive_n
 FROM bcs.recipients r JOIN bcs.companies c ON c.id=r.company_id
 JOIN bcs.portals p ON p.id=r.portal_id AND p.company_id=r.company_id
 WHERE c.company_code='softvat-bcs-demo' AND p.portal_code='skillmonk-demo';
 IF ROW(n,active_n,bounced_n,optout_n,inactive_n) IS DISTINCT FROM ROW(240,213,7,8,12) THEN
  RAISE EXCEPTION 'Synthetic recipient status count mismatch: %,%,%,%,%',n,active_n,bounced_n,optout_n,inactive_n; END IF;
 SELECT count(*) INTO group_n FROM bcs.audience_groups g JOIN bcs.companies c ON c.id=g.company_id
 JOIN bcs.portals p ON p.id=g.portal_id AND p.company_id=g.company_id
 WHERE c.company_code='softvat-bcs-demo' AND p.portal_code='skillmonk-demo';
 SELECT count(*) INTO sub_n FROM bcs.audience_subgroups g JOIN bcs.companies c ON c.id=g.company_id
 JOIN bcs.portals p ON p.id=g.portal_id AND p.company_id=g.company_id
 WHERE c.company_code='softvat-bcs-demo' AND p.portal_code='skillmonk-demo';
 SELECT count(*) INTO membership_n FROM bcs.recipient_group_memberships m
 JOIN bcs.companies c ON c.id=m.company_id JOIN bcs.portals p ON p.id=m.portal_id AND p.company_id=m.company_id
 WHERE c.company_code='softvat-bcs-demo' AND p.portal_code='skillmonk-demo';
 IF ROW(group_n,sub_n,membership_n) IS DISTINCT FROM ROW(4,12,240) THEN
   RAISE EXCEPTION 'Demo group/subgroup/membership count mismatch: %,%,%',group_n,sub_n,membership_n; END IF;
END $check$;
COMMIT;
-- No email delivery or consent is enabled by this seed.
