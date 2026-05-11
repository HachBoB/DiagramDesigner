export const DB_DIALECTS = {
    postgresql: {
        label: "PostgreSQL",
        types: [
            "SMALLINT",
            "INTEGER",
            "BIGINT",
            "DECIMAL",
            "NUMERIC",
            "REAL",
            "DOUBLE PRECISION",
            "SERIAL",
            "BIGSERIAL",
            "MONEY",
            "CHAR",
            "VARCHAR",
            "TEXT",
            "BOOLEAN",
            "DATE",
            "TIME",
            "TIMESTAMP",
            "TIMESTAMPTZ",
            "UUID",
            "JSON",
            "JSONB",
            "BYTEA",
            "INET"
        ]
    },
    mysql: {
        label: "MySQL",
        types: [
            "TINYINT",
            "SMALLINT",
            "MEDIUMINT",
            "INT",
            "BIGINT",
            "DECIMAL",
            "FLOAT",
            "DOUBLE",
            "BIT",
            "BOOLEAN",
            "CHAR",
            "VARCHAR",
            "TEXT",
            "TINYTEXT",
            "MEDIUMTEXT",
            "LONGTEXT",
            "DATE",
            "TIME",
            "DATETIME",
            "TIMESTAMP",
            "YEAR",
            "JSON",
            "BLOB",
            "TINYBLOB",
            "MEDIUMBLOB",
            "LONGBLOB"
        ]
    },
    sqlite: {
        label: "SQLite",
        types: [
            "INTEGER",
            "REAL",
            "TEXT",
            "BLOB",
            "NUMERIC",
            "BOOLEAN",
            "DATE",
            "DATETIME"
        ]
    },
    mssql: {
        label: "SQL Server",
        types: [
            "TINYINT",
            "SMALLINT",
            "INT",
            "BIGINT",
            "DECIMAL",
            "NUMERIC",
            "FLOAT",
            "REAL",
            "BIT",
            "CHAR",
            "VARCHAR",
            "TEXT",
            "NCHAR",
            "NVARCHAR",
            "NTEXT",
            "DATE",
            "TIME",
            "DATETIME",
            "DATETIME2",
            "UNIQUEIDENTIFIER",
            "VARBINARY"
        ]
    },
    oracle: {
        label: "Oracle",
        types: [
            "NUMBER",
            "FLOAT",
            "BINARY_FLOAT",
            "BINARY_DOUBLE",
            "CHAR",
            "VARCHAR2",
            "NCHAR",
            "NVARCHAR2",
            "CLOB",
            "NCLOB",
            "DATE",
            "TIMESTAMP",
            "RAW",
            "BLOB"
        ]
    }
};

export const RELATION_TYPES = [
    {
        value: "one-to-one",
        label: "One to One"
    },
    {
        value: "one-to-many",
        label: "One to Many"
    },
    {
        value: "many-to-many",
        label: "Many to Many"
    }
];

export const DEFAULT_DIALECT = "postgresql";