import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, Modal, Pressable, ScrollView, Share, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, TopBar, WoodButton, layout, pictureGalleryEnabled, usePalette, useReducedMotion, useThemedStyles } from '@/ui';
import { paintingImage } from '@/ui/gallery/paintingImages';
import {
  GAP,
  SIZE,
  applyMove,
  isMovable,
  isSolved,
  scramble,
  type Board,
} from '@/ui/gallery/slidePuzzle';

import { makeStyles } from '@/screen-styles/gallery.styles';
import { catalogSelectors, useCatalogStore } from '../state/catalogStore';
import { galleryView, gallerySelectors, useGalleryStore, type GalleryPaintingView } from '../state/galleryStore';

/**
 * B-M14 Picture Gallery ("The Paintings"). Four paintings revealed piece-by-piece
 * from the ALREADY persisted catalog (read-only), then hung via a one-time 3×3
 * slide-puzzle ceremony. Behind PICTURE_GALLERY_ENABLED — the route is only
 * reachable from the flag-gated Catalog entry. Screens consume view models via
 * the store boundary (`galleryView`); no `@/items` / `@/sim` value imports here.
 */
export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();

  const catalog = useCatalogStore(catalogSelectors.catalog);
  const loadCatalog = useCatalogStore((s) => s.loadCatalog);
  const hungPaintingIds = useGalleryStore(gallerySelectors.hungPaintingIds);
  const loadGallery = useGalleryStore((s) => s.loadGallery);
  const hangPainting = useGalleryStore((s) => s.hangPainting);

  // `?assemble=<paintingId>` opens the ceremony on mount for a complete, unhung
  // painting — a verification affordance (mirrors the catalog's `?item=`), inert
  // for any other id.
  const params = useLocalSearchParams<{ assemble?: string }>();
  const [assemblingId, setAssemblingId] = useState<string | null>(params.assemble ?? null);

  // Flag-off defense: the route file exists (file-based routing), so a direct URL
  // could reach it even with no entry point. When the flag is off, bounce back and
  // never read the catalog or gallery stores here.
  const enabled = pictureGalleryEnabled();
  useEffect(() => {
    if (!enabled) {
      router.replace('/');
      return;
    }
    void loadCatalog().catch(() => undefined);
    void loadGallery().catch(() => undefined);
  }, [enabled, loadCatalog, loadGallery, router]);

  if (!enabled) return null;

  const view = useMemo(() => galleryView(catalog, hungPaintingIds), [catalog, hungPaintingIds]);
  const assembling = useMemo(
    () => (assemblingId ? view.find((p) => p.id === assemblingId && p.readyToAssemble) ?? null : null),
    [assemblingId, view],
  );

  const onHang = async (id: string) => {
    await hangPainting(id).catch(() => undefined);
    setAssemblingId(null);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + layout.screenTopGap }]}>
      <TopBar title="The Paintings" backLabel="‹ Catalog" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + layout.screenBottomGap }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <AppText variant="body" color={palette.inkSoft}>
            Four paintings, earned by playing wider. Reveal every piece, then hang it.
          </AppText>
        </View>

        {view.map((painting) => (
          <PaintingCard
            key={painting.id}
            painting={painting}
            onAssemble={() => setAssemblingId(painting.id)}
          />
        ))}
      </ScrollView>

      <Modal
        visible={assembling !== null}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setAssemblingId(null)}
      >
        {assembling ? (
          <AssemblyCeremony
            painting={assembling}
            onHang={() => void onHang(assembling.id)}
            onClose={() => setAssemblingId(null)}
          />
        ) : null}
      </Modal>
    </View>
  );
}

/** One painting: header, the square image well (full when hung, else the reveal
 *  grid), a plain-language progress caption naming the source, and the
 *  Assemble / Share action. */
function PaintingCard({ painting, onAssemble }: { painting: GalleryPaintingView; onAssemble: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const [wellWidth, setWellWidth] = useState(0);
  const captureTarget = useRef<View>(null);
  const source = paintingImage(painting.id);

  const pct = painting.total > 0 ? Math.round((painting.piecesRevealed / painting.total) * 100) : 0;

  const onShare = async () => {
    try {
      const uri = await captureRef(captureTarget, { format: 'png', quality: 1 });
      await Share.share({ url: uri });
    } catch {
      // The painting is the artifact; if capture is unavailable, share nothing
      // rather than a different artifact.
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <AppText variant="title" color={palette.ink}>{painting.title}</AppText>
          {!painting.hung ? (
            <AppText variant="label" color={palette.inkFaint}>{painting.sourceCaption.toUpperCase()}</AppText>
          ) : null}
        </View>
        {painting.hung ? (
          <View style={styles.hungPill}>
            <MaterialCommunityIcons name="check" size={12} color={palette.accentTeal} />
            <AppText variant="label" color={palette.inkSoft}>HUNG</AppText>
          </View>
        ) : null}
      </View>

      <View
        ref={captureTarget}
        collapsable={false}
        onLayout={(e) => setWellWidth(e.nativeEvent.layout.width)}
        style={[styles.imageWell, { aspectRatio: 1 }]}
      >
        {wellWidth > 0 ? (
          painting.hung ? (
            source ? <Image source={source} style={styles.fullImage} resizeMode="cover" /> : null
          ) : (
            <RevealGrid painting={painting} source={source} size={wellWidth} />
          )
        ) : null}
      </View>

      {painting.hung ? (
        <>
          <AppText variant="body" color={palette.inkSoft} style={styles.flavor}>{painting.flavor}</AppText>
          <WoodButton label="Share Painting" variant="secondary" onPress={() => void onShare()} />
        </>
      ) : (
        <View style={styles.caption}>
          <View style={styles.captionRow}>
            <AppText variant="body" color={palette.inkSoft} style={styles.captionText}>{painting.sourceCaption}</AppText>
            <AppText variant="stat" color={palette.ink} style={styles.captionFraction}>{painting.progressLabel}</AppText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          {painting.readyToAssemble ? (
            <WoodButton label="Assemble" onPress={onAssemble} />
          ) : null}
        </View>
      )}
    </View>
  );
}

/**
 * The reveal grid: a rows×cols window over the full painting. A revealed cell
 * shows its slice of the image (an offset full image clipped by an overflow-hidden
 * cell — NO pre-sliced piece assets); an unrevealed cell is a recessed parchment
 * silhouette. Row-major scan order: the first `piecesRevealed` cells are shown.
 */
function RevealGrid({
  painting,
  source,
  size,
}: {
  painting: GalleryPaintingView;
  source: number | null;
  size: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const { rows, cols } = painting.revealGrid;
  const cell = Math.floor(size / cols);
  const imgW = cell * cols;
  const imgH = cell * rows;

  return (
    <View accessibilityLabel={`${painting.title}: ${painting.progressLabel} pieces revealed`}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={styles.gridRow}>
          {Array.from({ length: cols }, (_, c) => {
            const index = r * cols + c;
            const revealed = index < painting.piecesRevealed;
            return (
              <View
                key={c}
                style={[
                  styles.gridCell,
                  { height: cell, width: cell },
                  revealed ? styles.cellSeam : styles.cellHidden,
                  { alignItems: 'center', justifyContent: 'center' },
                ]}
              >
                {revealed && source ? (
                  <Image
                    source={source}
                    style={{ width: imgW, height: imgH, marginLeft: -c * cell, marginTop: -r * cell }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.cellHiddenDot, { height: Math.round(cell * 0.14), width: Math.round(cell * 0.14) }]} />
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * The assembly ceremony: the completed painting scrambled into a 3×3 slide puzzle
 * (always 3×3, even for the 4×4-reveal paintings). Tap a tile orthogonally
 * adjacent to the gap to slide it. Solved → a brief settle beat → the painting
 * hangs. "Hang it for me" grants the identical result (the puzzle never gates the
 * reward — the accessibility floor).
 */
function AssemblyCeremony({
  painting,
  onHang,
  onClose,
}: {
  painting: GalleryPaintingView;
  onHang: () => void;
  onClose: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const reduced = useReducedMotion();
  const source = paintingImage(painting.id);

  // Deterministic scramble per painting (solvable + not-already-solved by
  // construction — see slidePuzzle.ts). Fixed once per ceremony mount.
  const [board, setBoard] = useState<Board>(() => scramble(painting.id));
  const solved = isSolved(board);

  // On solve, settle briefly so the completed image reads, then hang. Reduced
  // motion hangs immediately (no settle beat).
  useEffect(() => {
    if (!solved) return;
    if (reduced) {
      onHang();
      return;
    }
    const t = setTimeout(onHang, 750);
    return () => clearTimeout(t);
    // onHang identity is stable enough for a one-shot; deps kept minimal on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, reduced]);

  const puzzleSize = Math.min(Dimensions.get('window').width - 96, 320);
  const tile = Math.floor(puzzleSize / SIZE);
  const imgSize = tile * SIZE;

  const tryMove = (index: number) => {
    if (solved) return;
    const next = applyMove(board, index);
    if (next) setBoard(next);
  };

  return (
    <View style={styles.modalScrim}>
      <View style={styles.modalCard}>
        <View style={styles.modalTitleRow}>
          <AppText variant="title" color={palette.ink}>{painting.title}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
            onPress={onClose}
            style={styles.modalClose}
          >
            <MaterialCommunityIcons name="close" size={20} color={palette.inkSoft} />
          </Pressable>
        </View>

        {solved ? (
          <View style={styles.solvedBanner}>
            <MaterialCommunityIcons name="check-circle" size={18} color={palette.accentTeal} />
            <AppText variant="heading" color={palette.tealDark}>Hanging it up…</AppText>
          </View>
        ) : (
          <AppText variant="body" color={palette.inkSoft} style={styles.hint}>
            Slide the tiles to rebuild the painting.
          </AppText>
        )}

        <View style={[styles.puzzleFrame, { height: imgSize, width: imgSize }]}>
          {Array.from({ length: SIZE }, (_, r) => (
            <View key={r} style={styles.puzzleRow}>
              {Array.from({ length: SIZE }, (_, c) => {
                const pos = r * SIZE + c;
                const value = board[pos]!;
                if (value === GAP && !solved) {
                  return <View key={c} style={[styles.puzzleGap, { height: tile, width: tile }]} />;
                }
                const srcRow = Math.floor(value / SIZE);
                const srcCol = value % SIZE;
                const movable = isMovable(board, pos);
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityLabel={`tile ${value + 1}, row ${r + 1} column ${c + 1}, ${movable ? 'movable' : 'locked'}`}
                    disabled={solved || !movable}
                    onPress={() => tryMove(pos)}
                    style={[styles.puzzleTile, styles.puzzleTileSeam, { height: tile, width: tile }]}
                  >
                    {source ? (
                      <Image
                        source={source}
                        style={{ width: imgSize, height: imgSize, marginLeft: -srcCol * tile, marginTop: -srcRow * tile }}
                        resizeMode="cover"
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.modalActions}>
          <WoodButton label="Hang it for me" variant="secondary" onPress={onHang} />
        </View>
      </View>
    </View>
  );
}
