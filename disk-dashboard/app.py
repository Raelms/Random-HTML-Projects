from flask import Flask, render_template, request, jsonify, send_file
import psutil, os, mimetypes

app = Flask(__name__)

def get_drives():
    drives = []
    for part in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(part.mountpoint)
            drives.append({
                "device": part.device,
                "mount": part.mountpoint,
                "total": usage.total,
                "used": usage.used,
                "free": usage.free,
                "percent": usage.percent
            })
        except:
            continue
    return drives

@app.route('/')
def index():
    drives = get_drives()
    return render_template("index.html", drives=drives)

@app.route('/browse', methods=['POST'])
def browse():
    path = request.json.get('path')
    if not os.path.exists(path):
        return jsonify({"error": "Path does not exist"}), 400
    try:
        files = os.listdir(path)
        content = []
        for f in files:
            full_path = os.path.join(path, f)
            content.append({
                "name": f,
                "is_dir": os.path.isdir(full_path),
                "path": full_path,
                "preview": get_preview(full_path) if not os.path.isdir(full_path) else None
            })
        return jsonify(content)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/download', methods=['GET'])
def download():
    path = request.args.get('path')
    if os.path.isfile(path):
        return send_file(path, as_attachment=True)
    return "File not found", 404

@app.route('/delete', methods=['POST'])
def delete():
    path = request.json.get('path')
    if os.path.exists(path):
        try:
            if os.path.isfile(path):
                os.remove(path)
            elif os.path.isdir(path):
                os.rmdir(path)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)})
    return jsonify({"error": "Path not found"})

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    path = request.form['path']
    if file and os.path.isdir(path):
        file.save(os.path.join(path, file.filename))
        return jsonify({"success": True})
    return jsonify({"error": "Invalid upload"})

def get_preview(path):
    mime, _ = mimetypes.guess_type(path)
    if mime:
        if mime.startswith('image'):
            return f"/download?path={path}"
        elif mime.startswith('text'):
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read(300)
            except:
                return None
    return None

if __name__ == "__main__":
    app.run(debug=True)