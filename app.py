import os
import feedparser
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        # Fetch and parse the RSS/Atom feed
        feed = feedparser.parse(FEED_URL)
        
        releases = []
        for entry in feed.entries:
            # Parse links
            link = entry.get('link', '')
            if not link and 'links' in entry and len(entry.links) > 0:
                link = entry.links[0].get('href', '')

            # Extract content or summary
            content = ""
            if 'content' in entry and len(entry.content) > 0:
                content = entry.content[0].value
            elif 'summary' in entry:
                content = entry.summary
            
            # Format published date
            published = entry.get('published', entry.get('updated', ''))
            
            releases.append({
                'id': entry.get('id', link),
                'title': entry.get('title', 'No Title'),
                'link': link,
                'published': published,
                'content': content
            })
            
        return jsonify({
            'success': True,
            'title': feed.feed.get('title', 'BigQuery Release Notes'),
            'releases': releases
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Flask runs locally
    app.run(debug=True, port=5000)
