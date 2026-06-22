import styles from '../../style/list_tile.module.css';

type ListTileProps = {
  leading: React.ComponentType<any>;
  heading: string;
  title?: string;
  trailing?: React.ComponentType<any>;
  width?: string | number;
  height?: string | number;
};

export const ListTile = ({
  leading: Leading,
  heading,
  title,
  trailing: Trailing,
  width,
  height,
}: ListTileProps) => {
  return (
    <div
      className={styles.list_tile}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        minHeight: typeof height === "number" ? `${height}px` : height,
      }}
    >
      <div className={styles.list_tile__leading}>
        <Leading />
      </div>

      <div className={styles.list_tile_body}>
        <div className={styles.list_tile_body__heading}>{heading}</div>
        {title && <div className={styles.list_tile_body__title}>{title}</div>}
      </div>

      {Trailing && (
        <div className={styles.list_tile__trailing}>
          <Trailing />
        </div>
      )}
    </div>
  );
};