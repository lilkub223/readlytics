"""Seed ONLY the fixed disposable QA port. No production configuration is accepted."""
import psycopg
with psycopg.connect(host='127.0.0.1',port=55432,dbname='postgres',user='postgres',password='postgres') as conn:
    with conn.cursor() as cur:
        for number,title in [(1,'QA Reading Journey'),(2,'QA Next Chapter')]:
            cur.execute('''INSERT INTO reading_service.books(id,external_source,external_id,title,authors,description,page_count,genres,published_year) VALUES (%s,'qa-fixture',%s,%s,ARRAY['Test Author'],'An isolated integration-test book.',200,ARRAY['Fiction'],2024) ON CONFLICT DO NOTHING''',(f'22222222-2222-4222-8222-{number:012}',f'qa-{number}',title))
print('QA catalog seeded in disposable database.')
