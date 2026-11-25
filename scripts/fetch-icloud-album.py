"""Download everything in a public iCloud shared album (photos.icloud.com link).

    python3 scripts/fetch-icloud-album.py <album-url-or-token> <out-dir>

Saves, per item:
  <name>.HEIC / .JPG / .MOV   the original file
  <name>_med.jpg              Apple's 2048px JPEG (handy where HEIC isn't)
  <name>_live.mov             the Live Photo motion clip, if there is one
plus manifest.json (filename, capture time, orientation).

Uses the same public endpoints the iCloud web viewer uses, so it needs these
hosts reachable: ckdatabasews.icloud.com, p<N>-ckdatabasews.icloud.com (the
album's partition, printed below) and cvws-h2.icloud-content.com.
Standard library only. Re-running skips files already downloaded.
"""
import base64
import json
import os
import sys
import urllib.parse
import urllib.request

CB = "clientBuildNumber=2642Build18&clientMasteringNumber=2642Build18"
HDR = {
    "Content-Type": "text/plain",
    "Origin": "https://photos.icloud.com",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
}


def post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=HDR, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main():
    arg, out = sys.argv[1], sys.argv[2]
    guid = arg.rstrip("/").split("/")[-1].split("#")[-1]
    os.makedirs(out, exist_ok=True)

    res = post(
        "https://ckdatabasews.icloud.com/database/1/com.apple.photos.cloud/production/public/records/resolve"
        f"?remapEnums=true&getCurrentSyncToken=true&{CB}&sharing_url_key={guid}",
        {"shortGUIDs": [{"value": guid}]},
    )["results"][0]
    access = res["anonymousPublicAccess"]
    host = access["databasePartition"].replace(":443", "")
    zone = res["zoneID"]
    title = res["share"]["fields"].get("cloudkit.title", {}).get("value")
    print(f"album: {title}  (partition {host})")

    qurl = (
        f"{host}/database/1/com.apple.photos.cloud/production/shared/records/query"
        f"?remapEnums=true&getCurrentSyncToken=true&sharing_url_key={guid}"
        f"&publicAccessAuthToken={urllib.parse.quote(access['token'])}&{CB}"
    )
    recs, rank = [], 0
    while True:
        q = {
            "query": {
                "recordType": "CPLAssetAndMasterByAddedDate",
                "filterBy": [
                    {"fieldName": "direction", "comparator": "EQUALS", "fieldValue": {"value": "ASCENDING", "type": "STRING"}},
                    {"fieldName": "startRank", "comparator": "EQUALS", "fieldValue": {"value": rank, "type": "INT64"}},
                ],
            },
            "zoneID": zone,
            "resultsLimit": 100,
        }
        got = post(qurl, q)["records"]
        n = sum(1 for r in got if r["recordType"] == "CPLAsset")
        if n == 0:
            break
        recs += got
        rank += n

    masters = {r["recordName"]: r for r in recs if r["recordType"] == "CPLMaster"}
    assets = [r for r in recs if r["recordType"] == "CPLAsset"]
    print(f"{len(assets)} items")

    def dl(field, path):
        v = field["value"]
        if os.path.exists(path) and os.path.getsize(path) == v["size"]:
            return
        urllib.request.urlretrieve(v["downloadURL"].replace("${f}", os.path.basename(path)), path)

    manifest = []
    for a in assets:
        f = a["fields"]
        m = masters[f["masterRef"]["value"]["recordName"]]["fields"]
        name = base64.b64decode(m["filenameEnc"]["value"]).decode()
        stem = os.path.splitext(name)[0]
        item = {
            "file": name,
            "takenMs": f.get("assetDate", {}).get("value"),
            "orientation": m.get("originalOrientation", {}).get("value"),
        }
        dl(m["resOriginalRes"], os.path.join(out, name))
        if "resJPEGMedRes" in m:
            dl(m["resJPEGMedRes"], os.path.join(out, stem + "_med.jpg"))
            item["med"] = stem + "_med.jpg"
        if "resOriginalVidComplRes" in m:
            dl(m["resOriginalVidComplRes"], os.path.join(out, stem + "_live.mov"))
            item["live"] = stem + "_live.mov"
        manifest.append(item)
        print("  ok", name)
    manifest.sort(key=lambda x: x["takenMs"] or 0)
    with open(os.path.join(out, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=1)


if __name__ == "__main__":
    main()
