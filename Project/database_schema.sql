CREATE DATABASE ApplicationProject;
GO

USE ApplicationProject;
GO

CREATE TABLE Users
(
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    MobileNo VARCHAR(15) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    CreatedDate DATETIME2 DEFAULT SYSDATETIME(),
    LastLogin DATETIME2 NULL
);
GO

CREATE TABLE Transactions
(
    TransactionID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    QRText VARCHAR(500) NOT NULL,
    QRLabel VARCHAR(200) NULL,
    ImagePath VARCHAR(500) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0,
    CreatedDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ModifiedDate DATETIME2 NULL,
    CONSTRAINT FK_Transactions_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT UQ_Transactions_QRText UNIQUE (QRText)
);
GO

CREATE OR ALTER PROCEDURE sp_AuthenticateOrRegister
    @MobileNo VARCHAR(15),
    @PasswordHash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM Users WHERE MobileNo = @MobileNo)
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM Users
            WHERE MobileNo = @MobileNo
              AND PasswordHash = @PasswordHash
        )
        BEGIN
            UPDATE Users
            SET LastLogin = SYSDATETIME()
            WHERE MobileNo = @MobileNo;

            SELECT
                'LOGIN_SUCCESS' AS Status,
                UserID,
                MobileNo
            FROM Users
            WHERE MobileNo = @MobileNo;
        END
        ELSE
        BEGIN
            SELECT 'INVALID_CREDENTIALS' AS Status, NULL AS UserID, NULL AS MobileNo;
        END
    END
    ELSE
    BEGIN
        INSERT INTO Users (MobileNo, PasswordHash, LastLogin)
        VALUES (@MobileNo, @PasswordHash, SYSDATETIME());

        SELECT
            'REGISTRATION_SUCCESS' AS Status,
            CAST(SCOPE_IDENTITY() AS INT) AS UserID,
            @MobileNo AS MobileNo;
    END
END;
GO

CREATE OR ALTER PROCEDURE sp_SaveOrUpdateTransaction
    @TransactionID INT = NULL,
    @UserID INT,
    @QRLabel VARCHAR(100),
    @QRText VARCHAR(500),
    @ImagePath VARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        IF @TransactionID IS NOT NULL
           AND EXISTS (
               SELECT 1
               FROM Transactions
               WHERE TransactionID = @TransactionID
                 AND UserID = @UserID
                 AND IsDeleted = 0
           )
        BEGIN
            UPDATE Transactions
            SET QRLabel = @QRLabel,
                QRText = @QRText,
                ImagePath = COALESCE(@ImagePath, ImagePath),
                ModifiedDate = SYSDATETIME()
            WHERE TransactionID = @TransactionID
              AND UserID = @UserID;

            SELECT 'TRANSACTION_UPDATED' AS Status, @TransactionID AS TransactionID;
        END
        ELSE
        BEGIN
            INSERT INTO Transactions (UserID, QRLabel, QRText, ImagePath)
            VALUES (@UserID, @QRLabel, @QRText, @ImagePath);

            SELECT 'TRANSACTION_SAVED' AS Status, CAST(SCOPE_IDENTITY() AS INT) AS TransactionID;
        END
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() IN (2601, 2627)
            SELECT 'DUPLICATE_QR_CODE' AS Status, NULL AS TransactionID;
        ELSE
            SELECT 'ERROR_OCCURRED' AS Status, NULL AS TransactionID;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_DeleteTransaction
    @TransactionID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Transactions
    SET IsDeleted = 1,
        ModifiedDate = SYSDATETIME()
    WHERE TransactionID = @TransactionID
      AND UserID = @UserID
      AND IsDeleted = 0;

    SELECT 'TRANSACTION_DELETED' AS Status;
END;
GO

CREATE OR ALTER VIEW vw_UserTransactionHistory
AS
SELECT
    t.TransactionID,
    u.UserID,
    u.MobileNo,
    t.QRLabel,
    t.QRText,
    t.ImagePath,
    t.CreatedDate AS TransactionDate,
    t.ModifiedDate AS LastModified
FROM Transactions t
INNER JOIN Users u ON t.UserID = u.UserID
WHERE t.IsDeleted = 0;
GO
