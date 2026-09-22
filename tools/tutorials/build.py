#!/usr/bin/env python3
"""Builds the narrated video guide to Gold Standard Notes.

    python3 tools/tutorials/build.py                     # narrate, record, compose, film
    python3 tools/tutorials/build.py --only tour,person  # just these tutorials, then the film
    python3 tools/tutorials/build.py --no-record         # recompose the last recording

Pipeline
  1. Voiceover. Every step's narration in script.json is spoken with an
     ElevenLabs voice (or macOS `say` for offline drafts). Clips are cached by
     text and voice, so only changed lines are regenerated. Clip lengths go to
     build/tutorials/narration.json, and each recorded step waits for its own.
  2. Recording. record.js drives the real app in Chrome from a prepared,
     fictional starting point and saves the frames Chrome paints, with times.
  3. Composition. Per tutorial: a title card, the footage under a teal step
     header, the voiceover, and captions - as an MP4 with the captions built
     in, plus a WebVTT file.
  4. Film. All tutorials in one MP4 with a chapter per tutorial, copied to
     the Desktop.

Needs ffmpeg (libx264), Pillow and Node with playwright-core (npm install in
this folder). The ElevenLabs key is read from $ELEVENLABS_API_KEY or
~/.config/elevenlabs/api_key - never from the project. Narration text is the
only thing sent anywhere; the recordings use fictional people.
"""
import argparse, hashlib, json, os, re, shutil, subprocess, sys, time
import urllib.error, urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SCRIPT = HERE / 'script.json'
OUT = ROOT / 'build' / 'tutorials'
FILM = 'gold-standard-notes-guide.mp4'
DESKTOP = Path.home() / 'Desktop' / 'Gold Standard Notes — video guide.mp4'

W, H = 1920, 1200          # final video: a 96 px step header over 1920 x 1104 of app
HEADER_H = 96
FPS = 30
TITLE_S = 3.0              # title card length

TEAL, TEAL_D, TEAL_L, AMBER, PAPER = (14, 90, 99), (8, 58, 64), (20, 134, 143), (233, 162, 59), (242, 245, 245)
AVENIR = '/System/Library/Fonts/Avenir Next.ttc'
FACES = {'bold': 0, 'demi': 2, 'medium': 5}

ELEVEN_API = 'https://api.elevenlabs.io'
ELEVEN_KEY_FILE = Path.home() / '.config' / 'elevenlabs' / 'api_key'
ELEVEN_MODEL = 'eleven_multilingual_v2'
ELEVEN_VOICE = 'EXAVITQu4vr4xnSDxMaL'   # Sarah, as in the NCLEX Prep guide
ELEVEN_SPEED = 0.88                     # about 150 words a minute
MAX_WPM = 170                           # a rushed take is redone proportionally slower

# Spoken forms only; captions keep the written text.
SAY_AS = [(r'\bIDDSI\b', 'id-see'), (r'\b1:1\b', 'one to one'), (r'\b2:1\b', 'two to one')]


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, text=True, capture_output=True, **kw)


def font(size, face):
    return ImageFont.truetype(AVENIR, size, index=FACES[face])


def duration_ms(path):
    out = run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(path)]).stdout
    return int(float(out) * 1000)


# 1. Voiceover ---------------------------------------------------------------

def eleven_key():
    key = os.environ.get('ELEVENLABS_API_KEY', '').strip()
    if not key and ELEVEN_KEY_FILE.exists():
        key = ELEVEN_KEY_FILE.read_text().strip()
    if not key:
        sys.exit(f'No ElevenLabs API key: set ELEVENLABS_API_KEY or save it to {ELEVEN_KEY_FILE}')
    return key


def eleven(key, path, body):
    request = urllib.request.Request(ELEVEN_API + path, method='POST', data=json.dumps(body).encode(),
                                     headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors='replace')
            if error.code in (429, 500, 502, 503) and attempt < 4:
                time.sleep(2 ** attempt * 3)
                continue
            sys.exit(f'ElevenLabs failed ({error.code}): {detail}')
        except (TimeoutError, urllib.error.URLError) as error:     # a slow or dropped connection: try again
            if attempt < 4:
                print(f'voiceover: ElevenLabs did not answer ({error}); trying again')
                time.sleep(2 ** attempt * 3)
                continue
            sys.exit(f'ElevenLabs could not be reached: {error}')


def speak_eleven(key, speed, spoken, target):
    mp3 = target.with_suffix('.mp3')
    mp3.write_bytes(eleven(key, f'/v1/text-to-speech/{ELEVEN_VOICE}?output_format=mp3_44100_128', {
        'text': spoken, 'model_id': ELEVEN_MODEL,
        'voice_settings': {'stability': 0.6, 'similarity_boost': 0.75, 'style': 0, 'speed': speed}}))
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp3), '-ar', '48000', '-ac', '1', str(target)])
    mp3.unlink()


def speak_say(spoken, target):
    aiff = target.with_suffix('.aiff')
    run(['say', '-v', 'Daniel', '-r', '165', '-o', str(aiff), spoken])
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(aiff), '-ar', '48000', '-ac', '1', str(target)])
    aiff.unlink()


def narrate(tutorials, engine):
    audio = OUT / 'audio'
    audio.mkdir(parents=True, exist_ok=True)
    jobs = []
    for tut in tutorials:
        for step in tut['steps']:
            spoken = step['say']
            for pattern, repl in SAY_AS:
                spoken = re.sub(pattern, repl, spoken)
            digest = hashlib.sha1(f'{engine}|{ELEVEN_VOICE}|{ELEVEN_SPEED}|{spoken}'.encode()).hexdigest()[:12]
            step['wav'] = audio / f'{digest}.wav'
            if not step['wav'].exists():
                jobs.append((spoken, step['wav']))
    if jobs:
        print(f'voiceover: {len(jobs)} new clips, {sum(len(s) for s, _ in jobs):,} characters')
        key = eleven_key() if engine == 'elevenlabs' else None
    for spoken, wav in jobs:
        if engine == 'elevenlabs':
            speak_eleven(key, ELEVEN_SPEED, spoken, wav)
            pace = len(spoken.split()) / (duration_ms(wav) / 60000)
            if pace > MAX_WPM:
                speak_eleven(key, max(0.7, round(ELEVEN_SPEED * MAX_WPM / pace, 2)), spoken, wav)
        else:
            speak_say(spoken, wav)
    lengths = {}
    for tut in tutorials:
        for step in tut['steps']:
            step['ms'] = duration_ms(step['wav'])
            lengths[f"{tut['id']}.{step['id']}"] = step['ms']
    (OUT / 'narration.json').write_text(json.dumps(lengths, indent=1, sort_keys=True))
    print(f'voiceover: {len(lengths)} clips, {sum(lengths.values()) / 60000:.1f} minutes')


# 2. Recording ---------------------------------------------------------------

def record(only):
    cmd = ['node', str(HERE / 'record.js')] + ([f'--only={",".join(only)}'] if only else [])
    result = subprocess.run(cmd, cwd=ROOT, text=True)
    if result.returncode:
        sys.exit('Recording failed - see the messages above.')


# 3. Composition -------------------------------------------------------------

def wrap(draw, text, f, width):
    lines, line = [], ''
    for word in text.split():
        trial = f'{line} {word}'.strip()
        if draw.textlength(trial, font=f) <= width:
            line = trial
        else:
            lines.append(line)
            line = word
    return lines + [line]


def icon(size):
    """The app icon (icon.svg), drawn at `size` pixels."""
    k = size / 512
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    box = lambda x, y, w, h: (x * k, y * k, (x + w) * k, (y + h) * k)
    d.rounded_rectangle(box(0, 0, 512, 512), 112 * k, fill=TEAL)
    d.rounded_rectangle(box(132, 96, 248, 320), 26 * k, fill=PAPER)
    d.rounded_rectangle(box(206, 66, 100, 56), 20 * k, fill=TEAL_L)
    for y, x2 in ((196, 290), (252, 334), (308, 310)):
        d.line((178 * k, y * k, x2 * k, y * k), fill=TEAL, width=round(18 * k))
        for x in (178, x2):
            d.ellipse(((x - 9) * k, (y - 9) * k, (x + 9) * k, (y + 9) * k), fill=TEAL)
    d.ellipse(((356 - 62) * k, (352 - 62) * k, (356 + 62) * k, (352 + 62) * k), fill=TEAL_L)
    d.line([(328 * k, 352 * k), (348 * k, 373 * k), (387 * k, 331 * k)], fill=PAPER, width=round(20 * k), joint='curve')
    return img


def title_card(number, total, tut, path):
    card = Image.new('RGB', (W, H), TEAL_D)
    fade = Image.linear_gradient('L').resize((W, H)).transpose(Image.FLIP_TOP_BOTTOM)
    card.paste(Image.new('RGB', (W, H), TEAL), (0, 0), fade)
    d = ImageDraw.Draw(card)
    mark = icon(200)
    card.paste(mark, (160, 330), mark)
    d.text((160, 580), f'GOLD STANDARD NOTES  ·  TUTORIAL {number} OF {total}', font=font(34, 'demi'), fill=(178, 222, 222))
    y = 640
    for line in wrap(d, tut['title'], font(92, 'bold'), W - 320):
        d.text((160, y), line, font=font(92, 'bold'), fill='white')
        y += 108
    y += 20
    for line in wrap(d, tut['summary'], font(44, 'medium'), W - 420):
        d.text((160, y), line, font=font(44, 'medium'), fill=(214, 238, 238))
        y += 60
    card.save(path)


def header(index, total, tut_title, text, path):
    band = Image.new('RGB', (W, HEADER_H), TEAL)
    d = ImageDraw.Draw(band)
    d.ellipse((32, 22, 84, 74), fill=AMBER)
    n = str(index)
    d.text((58 - d.textlength(n, font=font(30, 'bold')) / 2, 28), n, font=font(30, 'bold'), fill='white')
    d.text((106, 26), text, font=font(36, 'demi'), fill='white')
    right = tut_title.upper()
    rf = font(22, 'demi')
    dots_w = total * 22
    d.text((W - 48 - dots_w - 24 - d.textlength(right, font=rf), 36), right, font=rf, fill=(178, 222, 222))
    for i in range(total):
        x = W - 48 - (total - i) * 22
        d.ellipse((x, 43, x + 10, 53), fill=(255, 255, 255) if i < index else (60, 150, 156))
    band.save(path)


def vtt_time(s):
    h, rem = divmod(max(s, 0), 3600)
    m, sec = divmod(rem, 60)
    return f'{int(h):02d}:{int(m):02d}:{sec:06.3f}'


def footage(raw, start, end, target):
    """The recorded frames as a constant-rate video from `start` to `end` (seconds)."""
    marks = json.loads((raw / 'marks.json').read_text())
    frames = sorted(marks['frames'], key=lambda f: f['t'])
    before = [f for f in frames if f['t'] <= start]
    kept = ([dict(before[-1], t=start)] if before else []) + [f for f in frames if start < f['t'] < end]
    lines = ["ffconcat version 1.0"]
    for i, f in enumerate(kept):
        nxt = kept[i + 1]['t'] if i + 1 < len(kept) else end
        lines += [f"file '{f['file']}'", f'duration {max(nxt - f["t"], 0.001):.4f}']
    lines.append(f"file '{kept[-1]['file']}'")
    listing = raw / 'frames.ffconcat'
    listing.write_text('\n'.join(lines) + '\n')
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(listing),
         '-vf', f'fps={FPS},scale={W}:{H - HEADER_H}:flags=lanczos,setsar=1,format=yuv420p',
         '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', str(target)])


def compose(number, total, tut):
    tid = tut['id']
    folder = OUT / tid
    raw = folder / 'raw'
    marks = json.loads((raw / 'marks.json').read_text())
    steps = tut['steps']
    missing = [s['id'] for s in steps if s['id'] not in marks['steps']]
    if missing:
        print(f'SKIP {tid}: incomplete recording (missing {missing})')
        return None
    start = marks['steps'][steps[0]['id']] - 0.3
    end = marks['end']
    length = end - start
    footage(raw, start, end, folder / 'app.mp4')

    title_card(number, total, tut, folder / 'title.png')
    starts = [marks['steps'][s['id']] - start for s in steps]
    for i, step in enumerate(steps):
        header(i + 1, len(steps), tut['title'], step['title'], folder / f'h{i + 1}.png')

    cues = ['WEBVTT', '']
    for i, step in enumerate(steps):
        begin = TITLE_S + starts[i]
        clip = step['ms'] / 1000
        sentences = [s.strip() for s in re.findall(r'[^.!?]+[.!?]*', step['say']) if s.strip()] or [step['say']]
        chars = sum(len(s) for s in sentences)
        t = begin
        for sentence in sentences:
            span = clip * len(sentence) / chars
            cues += [f'{vtt_time(t)} --> {vtt_time(t + span)}', sentence, '']
            t += span
    vtt = folder / f'{tid}.vtt'
    vtt.write_text('\n'.join(cues))

    inputs = ['-i', str(folder / 'app.mp4'), '-loop', '1', '-t', str(TITLE_S), '-i', str(folder / 'title.png')]
    for i in range(len(steps)):
        inputs += ['-i', str(folder / f'h{i + 1}.png')]
    for step in steps:
        inputs += ['-i', str(step['wav'])]
    inputs += ['-i', str(vtt)]

    graph = [f'[0:v]pad={W}:{H}:0:{HEADER_H}:color=white,setsar=1[v0]']
    last = 'v0'
    for i in range(len(steps)):
        until = starts[i + 1] if i + 1 < len(steps) else length + 1
        begin = 0 if i == 0 else starts[i]
        graph.append(f"[{last}][{i + 2}:v]overlay=0:0:enable='between(t,{begin:.3f},{until:.3f})'[v{i + 1}]")
        last = f'v{i + 1}'
    graph.append(f'[1:v]fps={FPS},scale={W}:{H},setsar=1,format=yuv420p[tc]')
    graph.append(f'[{last}]format=yuv420p[app]')
    graph.append('[tc][app]concat=n=2:v=1:a=0[video]')
    audio_base = 2 + len(steps)
    mixes = []
    for i in range(len(steps)):
        delay = int((TITLE_S + starts[i]) * 1000)
        graph.append(f'[{audio_base + i}:a]adelay={delay}|{delay}[a{i}]')
        mixes.append(f'[a{i}]')
    duration = TITLE_S + length
    graph.append(f"{''.join(mixes)}amix=inputs={len(steps)}:normalize=0,apad,atrim=0:{duration:.3f}[audio]")

    video = folder / f'{tid}.mp4'
    subs = audio_base + len(steps)
    run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(graph),
         '-map', '[video]', '-map', '[audio]', '-map', f'{subs}:s',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-tune', 'stillimage', '-pix_fmt', 'yuv420p',
         '-c:a', 'aac', '-b:a', '112k', '-c:s', 'mov_text', '-metadata:s:s:0', 'language=eng',
         '-metadata', f'title={tut["title"]}', '-movflags', '+faststart', '-t', f'{duration:.3f}', str(video)])
    (folder / 'app.mp4').unlink()
    print(f'{tid}: {duration:.0f}s, {video.stat().st_size / 1e6:.1f} MB')
    return {'id': tid, 'title': tut['title'], 'video': video}


# 4. The film ----------------------------------------------------------------

def film(tutorials):
    videos = [OUT / t['id'] / f"{t['id']}.mp4" for t in tutorials]
    missing = [v for v in videos if not v.exists()]
    if missing:
        print(f'film: not made yet - {len(missing)} tutorial(s) still to record')
        return
    listing = OUT / 'film.txt'
    listing.write_text(''.join(f"file '{v}'\n" for v in videos))
    chapters, start = [';FFMETADATA1', 'title=Gold Standard Notes — video guide'], 0
    for tut, v in zip(tutorials, videos):
        end = start + duration_ms(v)
        chapters += ['[CHAPTER]', 'TIMEBASE=1/1000', f'START={start}', f'END={end}', f"title={tut['title']}"]
        start = end
    meta = OUT / 'chapters.txt'
    meta.write_text('\n'.join(chapters) + '\n')
    target = OUT / FILM
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(listing), '-i', str(meta),
         '-map', '0', '-map_metadata', '1', '-c', 'copy', '-movflags', '+faststart', str(target)])
    shutil.copyfile(target, DESKTOP)
    print(f'film: {start / 60000:.1f} minutes, {target.stat().st_size / 1e6:.1f} MB -> {DESKTOP}')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--only', default='', help='comma-separated tutorial ids')
    ap.add_argument('--no-record', action='store_true', help='recompose the last recording')
    ap.add_argument('--engine', choices=['elevenlabs', 'say'], default='elevenlabs')
    args = ap.parse_args()
    tutorials = json.loads(SCRIPT.read_text())['tutorials']
    only = [x for x in args.only.split(',') if x]
    OUT.mkdir(parents=True, exist_ok=True)
    narrate(tutorials, args.engine)
    if not args.no_record:
        record(only)
    for number, tut in enumerate(tutorials, 1):
        if not only or tut['id'] in only:
            compose(number, len(tutorials), tut)
    film(tutorials)


if __name__ == '__main__':
    main()
